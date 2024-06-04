import { Session } from '@shopify/shopify-api';
import { CreateStockTransfer } from '../../schemas/generated/create-stock-transfer.js';
import { validateCreateStockTransfer } from './validate.js';
import { db } from '../db/db.js';
import { getNewStockTransferName } from '../id-formatting.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { unit } from '../db/unit-of-work.js';
import { IGetLineItemsResult, IGetResult } from '../db/queries/generated/stock-transfers.sql.js';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Int, InventoryChangeInput } from '../gql/queries/generated/schema.js';
import { assertGidOrNull } from '../../util/assertions.js';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { GraphqlUserErrors, HttpError } from '@teifi-digital/shopify-app-express/errors';
import { gql } from '../gql/gql.js';

export async function upsertStockTransfer(session: Session, createStockTransfer: CreateStockTransfer) {
  await validateCreateStockTransfer(session, createStockTransfer);

  return await unit(async () => {
    const [previousStockTransfer] = createStockTransfer.name
      ? await db.stockTransfers.get({ shop: session.shop, name: createStockTransfer.name })
      : [];

    const [stockTransfer = never()] = await db.stockTransfers.upsert({
      shop: session.shop,
      name: createStockTransfer.name || (await getNewStockTransferName(session.shop)),
      fromLocationId: createStockTransfer.fromLocationId,
      toLocationId: createStockTransfer.toLocationId,
      note: createStockTransfer.note,
    });

    const { id: stockTransferId } = stockTransfer;

    const previousLineItems = await db.stockTransfers.getLineItems({ stockTransferId });

    await db.stockTransfers.removeLineItems({ stockTransferId: stockTransfer.id });
    await upsertLineItems(createStockTransfer, stockTransfer.id);

    const currentLineItems = await db.stockTransfers.getLineItems({ stockTransferId });

    const getLocationIds = (stockTransfer: IGetResult | undefined) => {
      const from = stockTransfer?.fromLocationId ?? null;
      const to = stockTransfer?.toLocationId ?? null;
      assertGidOrNull(from);
      assertGidOrNull(to);
      return {
        from,
        to,
      };
    };

    await adjustShopifyInventory(
      session,
      getLocationIds(previousStockTransfer),
      getLocationIds(stockTransfer),
      previousLineItems,
      currentLineItems,
    );

    return stockTransfer;
  });
}

async function upsertLineItems(createStockTransfer: CreateStockTransfer, stockTransferId: number) {
  if (!createStockTransfer.lineItems.length) {
    return;
  }

  await db.stockTransfers.upsertLineItems({
    lineItems: createStockTransfer.lineItems.map(lineItem => ({
      uuid: lineItem.uuid,
      stockTransferId,
      quantity: lineItem.quantity,
      inventoryItemId: lineItem.inventoryItemId,
      productTitle: lineItem.productTitle,
      productVariantTitle: lineItem.productVariantTitle,
      status: lineItem.status,
    })),
  });
}

async function adjustShopifyInventory(
  session: Session,
  previousLocations: { from: ID | null; to: ID | null },
  currentLocations: { from: ID | null; to: ID | null },
  previousLineItems: IGetLineItemsResult[],
  currentLineItems: IGetLineItemsResult[],
) {
  const deltaByLocationByInventoryItem: Record<ID, Record<ID, number>> = {};

  for (const { lineItems, factor, fromLocationId, toLocationId } of [
    {
      lineItems: previousLineItems,
      factor: -1,
      fromLocationId: previousLocations.from,
      toLocationId: previousLocations.to,
    },
    {
      lineItems: currentLineItems,
      factor: 1,
      fromLocationId: currentLocations.from,
      toLocationId: currentLocations.to,
    },
  ]) {
    for (const lineItem of lineItems) {
      assertGid(lineItem.inventoryItemId);

      // TODO: Get rid of restocked

      if (['IN_TRANSIT', 'RECEIVED', 'REJECTED'].includes(lineItem.status)) {
        // Remove quantity from the source inventory.
        if (fromLocationId) {
          const deltaByInventoryItem = (deltaByLocationByInventoryItem[fromLocationId] ??= {});
          deltaByInventoryItem[lineItem.inventoryItemId] ??= 0;
          deltaByInventoryItem[lineItem.inventoryItemId] -= lineItem.quantity * factor;
        }
      }

      if (lineItem.status === 'RECEIVED') {
        // Add quantity to the destination inventory.
        if (toLocationId) {
          const deltaByInventoryItem = (deltaByLocationByInventoryItem[toLocationId] ??= {});
          deltaByInventoryItem[lineItem.inventoryItemId] ??= 0;
          deltaByInventoryItem[lineItem.inventoryItemId] += lineItem.quantity * factor;
        }
      }
    }
  }

  const changes: InventoryChangeInput[] = [];
  for (const [locationId, deltaByInventoryItem] of entries(deltaByLocationByInventoryItem)) {
    for (const [inventoryItemId, delta] of entries(deltaByInventoryItem)) {
      changes.push({
        locationId,
        inventoryItemId,
        delta: delta as Int,
      });
    }
  }

  const graphql = new Graphql(session);

  try {
    const { inventoryAdjustQuantities } = await gql.inventory.adjust.run(graphql, {
      input: { name: 'available', reason: 'other', changes },
    });

    if (!inventoryAdjustQuantities) {
      throw new HttpError('Failed to adjust inventory', 500);
    }
  } catch (error) {
    if (error instanceof GraphqlUserErrors) {
      sentryErr('Failed to adjust inventory', { userErrors: error.userErrors });
      throw new HttpError('Failed to adjust inventory', 500);
    }

    throw error;
  }
}
