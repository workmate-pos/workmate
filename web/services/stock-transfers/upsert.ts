import { Session } from '@shopify/shopify-api';
import { CreateStockTransfer } from '../../schemas/generated/create-stock-transfer.js';
import { validateCreateStockTransfer } from './validate.js';
import { getNewTransferOrderName } from '../id-formatting.js';
import { unit } from '../db/unit-of-work.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertGidOrNull } from '../../util/assertions.js';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { GraphqlUserErrors, HttpError } from '@teifi-digital/shopify-app-express/errors';
import {
  getStockTransfer,
  getStockTransferLineItems,
  removeStockTransferLineItems,
  StockTransfer,
  StockTransferLineItem,
  upsertStockTransfer,
  upsertStockTransferLineItems,
} from './queries.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';
import { assertLocationsPermitted } from '../franchises/assert-locations-permitted.js';
import { httpError } from '../../util/http-error.js';
import { AdjustInventoryQuantities, mutateInventoryQuantities } from '../inventory/adjust.js';

export async function upsertCreateStockTransfer(
  session: Session,
  user: LocalsTeifiUser,
  createStockTransfer: CreateStockTransfer,
) {
  await assertLocationsPermitted({
    shop: session.shop,
    locationIds: [createStockTransfer.fromLocationId, createStockTransfer.toLocationId],
    staffMemberId: user.staffMember.id,
  });

  await validateCreateStockTransfer(session, createStockTransfer, user);

  return await unit(async () => {
    const previousStockTransfer = createStockTransfer.name
      ? ((await getStockTransfer({ shop: session.shop, name: createStockTransfer.name, locationIds: null })) ??
        httpError('Stock transfer not found', 404))
      : null;

    const stockTransfer = await upsertStockTransfer({
      shop: session.shop,
      name: createStockTransfer.name ?? (await getNewTransferOrderName(session.shop)),
      fromLocationId: createStockTransfer.fromLocationId,
      toLocationId: createStockTransfer.toLocationId,
      note: createStockTransfer.note,
    });

    const { id: stockTransferId } = stockTransfer;

    const previousLineItems = await getStockTransferLineItems(stockTransferId);
    await removeStockTransferLineItems(stockTransferId);
    await upsertStockTransferLineItems(stockTransferId, createStockTransfer.lineItems);

    const getLocationIds = (stockTransfer: StockTransfer | null) => {
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
      user,
      stockTransfer.name,
      getLocationIds(previousStockTransfer),
      getLocationIds(stockTransfer),
      previousLineItems,
      createStockTransfer.lineItems,
    );

    return stockTransfer;
  });
}

async function adjustShopifyInventory(
  session: Session,
  user: LocalsTeifiUser,
  name: string,
  previousLocations: { from: ID | null; to: ID | null },
  currentLocations: { from: ID | null; to: ID | null },
  previousLineItems: StockTransferLineItem[],
  currentLineItems: CreateStockTransfer['lineItems'],
) {
  const deltaByLocationByInventoryItem: Record<ID, Record<ID, Record<'incoming' | 'available', number>>> = {};

  const transfers: {
    lineItems: Pick<StockTransferLineItem, 'uuid' | 'quantity' | 'inventoryItemId' | 'status'>[];
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

  const availableChanges: AdjustInventoryQuantities['changes'] = [];
  const incomingChanges: AdjustInventoryQuantities['changes'] = [];

  for (const [locationId, deltasByInventoryItem] of entries(deltaByLocationByInventoryItem)) {
    for (const [inventoryItemId, deltas] of entries(deltasByInventoryItem)) {
      availableChanges.push({
        locationId,
        inventoryItemId,
        delta: deltas.available,
      });

      incomingChanges.push({
        locationId,
        inventoryItemId,
        delta: deltas.incoming,
      });
    }
  }

  try {
    // this cannot be done atomically currently because `setQuantities` only supports available/on_hand
    await Promise.all([
      mutateInventoryQuantities(session, {
        type: 'adjust',
        initiator: { type: 'stock-transfer', name },
        reason: 'movement_updated',
        name: 'available',
        staffMemberId: user.staffMember.id,
        changes: availableChanges,
      }),
      mutateInventoryQuantities(session, {
        type: 'adjust',
        initiator: { type: 'stock-transfer', name },
        reason: 'movement_updated',
        name: 'incoming',
        staffMemberId: user.staffMember.id,
        changes: incomingChanges,
      }),
    ]);
  } catch (error) {
    if (error instanceof GraphqlUserErrors) {
      sentryErr('Failed to adjust inventory', { userErrors: error.userErrors });
      throw new HttpError('Failed to adjust inventory', 500);
    }

    throw error;
  }
}
