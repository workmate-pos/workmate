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
      stockTransfer.name,
      getLocationIds(previousStockTransfer),
      getLocationIds(stockTransfer),
      previousLineItems,
      createStockTransfer.lineItems,
    );

    return stockTransfer;
  });
}

async function upsertLineItems(createStockTransfer: CreateStockTransfer, stockTransferId: number) {
  if (!createStockTransfer.lineItems.length) {
    return [];
  }

  return await db.stockTransfers.upsertLineItems({
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
  name: string,
  previousLocations: { from: ID | null; to: ID | null },
  currentLocations: { from: ID | null; to: ID | null },
  previousLineItems: IGetLineItemsResult[],
  currentLineItems: CreateStockTransfer['lineItems'],
) {
  const deltaByLocationByInventoryItem: Record<ID, Record<ID, Record<'incoming' | 'available', number>>> = {};

  const transfers: {
    lineItems: Pick<IGetLineItemsResult, 'uuid' | 'quantity' | 'inventoryItemId' | 'status'>[];
    factor: number;
    fromLocationId: ID | null;
    toLocationId: ID | null;
  }[] = [
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
  ];

  for (const { lineItems, factor, fromLocationId, toLocationId } of transfers) {
    for (const lineItem of lineItems) {
      assertGid(lineItem.inventoryItemId);

      if (['IN_TRANSIT', 'RECEIVED', 'REJECTED'].includes(lineItem.status)) {
        // Remove quantity from the source inventory.
        if (fromLocationId) {
          const deltaByInventoryItem = (deltaByLocationByInventoryItem[fromLocationId] ??= {});
          const deltas = (deltaByInventoryItem[lineItem.inventoryItemId] ??= { incoming: 0, available: 0 });
          deltas.available -= lineItem.quantity * factor;
        }
      }

      if (lineItem.status === 'IN_TRANSIT') {
        // Add quantity to the destination inventory as incoming.
        if (toLocationId) {
          const deltaByInventoryItem = (deltaByLocationByInventoryItem[toLocationId] ??= {});
          const deltas = (deltaByInventoryItem[lineItem.inventoryItemId] ??= { incoming: 0, available: 0 });
          deltas.incoming += lineItem.quantity * factor;
        }
      }

      if (lineItem.status === 'RECEIVED') {
        // Add quantity to the destination inventory as available.
        if (toLocationId) {
          const deltaByInventoryItem = (deltaByLocationByInventoryItem[toLocationId] ??= {});
          const deltas = (deltaByInventoryItem[lineItem.inventoryItemId] ??= { incoming: 0, available: 0 });
          deltas.available += lineItem.quantity * factor;
        }
      }
    }
  }

  const availableChanges: InventoryChangeInput[] = [];
  const incomingChanges: InventoryChangeInput[] = [];

  const ledgerDocumentUri = `workmate://stock-transfer/${encodeURIComponent(name)}`;

  for (const [locationId, deltasByInventoryItem] of entries(deltaByLocationByInventoryItem)) {
    for (const [inventoryItemId, deltas] of entries(deltasByInventoryItem)) {
      availableChanges.push({
        locationId,
        inventoryItemId,
        delta: deltas.available as Int,
      });

      incomingChanges.push({
        locationId,
        inventoryItemId,
        delta: deltas.incoming as Int,
        ledgerDocumentUri,
      });
    }
  }

  const graphql = new Graphql(session);

  try {
    // TODO: use this once it releases: https://shopify.dev/docs/api/admin-graphql/2024-07/mutations/inventorySetQuantities
    //  -> current mutation is not atomic bcs its 2 mutations in 1
    await gql.inventory.adjustIncomingAvailable.run(graphql, {
      reason: 'other',
      availableChanges,
      incomingChanges,
    });
  } catch (error) {
    if (error instanceof GraphqlUserErrors) {
      sentryErr('Failed to adjust inventory', { userErrors: error.userErrors });
      throw new HttpError('Failed to adjust inventory', 500);
    }

    throw error;
  }
}
