import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { unit } from '../db/unit-of-work.js';
import { gql } from '../gql/gql.js';
import { insertInventoryMutation, insertInventoryMutationItems, InventoryMutationInitiatorType } from './queries.js';
import { escapeTransaction } from '../db/client.js';

/**
 * Adjust inventory quantities on Shopify and log to the WorkMate Inventory Adjustment log.
 */
export function mutateInventoryQuantities(session: Session, mutation: MutateInventoryQuantities) {
  if (mutation.changes.length === 0) {
    return;
  }

  switch (mutation.type) {
    case 'move':
      return moveInventoryQuantities(session, mutation);

    case 'set':
      return setInventoryQuantities(session, mutation);

    case 'adjust':
      return adjustInventoryQuantities(session, mutation);

    default:
      return mutation satisfies never;
  }
}

const MUTATION_INITIATOR_TYPE: Record<InventoryMutationInitiator['type'], InventoryMutationInitiatorType> = {
  'purchase-order': 'PURCHASE_ORDER',
  'purchase-order-receipt': 'PURCHASE_ORDER_RECEIPT',
  'stock-transfer': 'STOCK_TRANSFER',
  'cycle-count': 'CYCLE_COUNT',
  'work-order': 'WORK_ORDER',
  unknown: 'UNKNOWN',
};

async function moveInventoryQuantities(session: Session, mutation: MoveInventoryQuantities) {
  const { shop } = session;
  const graphql = new Graphql(session);

  await escapeTransaction(() =>
    unit(async () => {
      const inventoryMutationId = await insertInventoryMutation({
        shop,
        type: 'MOVE',
        initiator: { name: mutation.initiator.name, type: MUTATION_INITIATOR_TYPE[mutation.initiator.type] },
      });

      await insertInventoryMutationItems(
        mutation.changes.flatMap(change => {
          const base = {
            inventoryMutationId,
            inventoryItemId: change.inventoryItemId,
            locationId: change.locationId,
            delta: null,
            compareQuantity: null,
          };

          return [
            { ...base, quantityName: change.to, quantity: change.quantity },
            { ...base, quantityName: change.from, quantity: -change.quantity },
          ];
        }),
      );

      const documentUri = getInitiatorDocumentUri(mutation.initiator, inventoryMutationId);

      await gql.inventory.moveQuantities.run(graphql, {
        input: {
          reason: mutation.reason,
          referenceDocumentUri: documentUri,
          changes: mutation.changes.map(({ from, to, inventoryItemId, quantity, locationId }) => ({
            from: {
              name: from,
              locationId,
              ledgerDocumentUri: from === 'available' ? undefined : documentUri,
            },
            to: {
              name: to,
              locationId,
              ledgerDocumentUri: to === 'available' ? undefined : documentUri,
            },
            inventoryItemId,
            quantity,
          })),
        },
      });
    }),
  );
}

async function setInventoryQuantities(session: Session, mutation: SetInventoryQuantities) {
  const { shop } = session;
  const graphql = new Graphql(session);

  await escapeTransaction(() =>
    unit(async () => {
      const inventoryMutationId = await insertInventoryMutation({
        shop,
        type: 'SET',
        initiator: { name: mutation.initiator.name, type: MUTATION_INITIATOR_TYPE[mutation.initiator.type] },
      });

      await insertInventoryMutationItems(
        mutation.changes.map(change => ({
          inventoryMutationId,
          inventoryItemId: change.inventoryItemId,
          locationId: change.locationId,
          delta: null,
          compareQuantity: change.compareQuantity,
          quantityName: mutation.name,
          quantity: change.quantity,
        })),
      );

      const documentUri = getInitiatorDocumentUri(mutation.initiator, inventoryMutationId);

      await gql.inventory.setQuantities.run(graphql, {
        input: {
          reason: mutation.reason,
          name: mutation.name,
          referenceDocumentUri: documentUri,
          ignoreCompareQuantity: false,
          quantities: mutation.changes.map(({ inventoryItemId, locationId, quantity, compareQuantity }) => ({
            compareQuantity,
            locationId,
            quantity,
            inventoryItemId,
          })),
        },
      });
    }),
  );
}

async function adjustInventoryQuantities(session: Session, mutation: AdjustInventoryQuantities) {
  const { shop } = session;
  const graphql = new Graphql(session);

  await escapeTransaction(() =>
    unit(async () => {
      const inventoryMutationId = await insertInventoryMutation({
        shop,
        type: 'ADJUST',
        initiator: { name: mutation.initiator.name, type: MUTATION_INITIATOR_TYPE[mutation.initiator.type] },
      });

      await insertInventoryMutationItems(
        mutation.changes.map(change => ({
          inventoryMutationId,
          inventoryItemId: change.inventoryItemId,
          locationId: change.locationId,
          delta: change.delta,
          compareQuantity: null,
          quantityName: mutation.name,
          quantity: null,
        })),
      );

      const documentUri = getInitiatorDocumentUri(mutation.initiator, inventoryMutationId);

      await gql.inventory.adjust.run(graphql, {
        input: {
          reason: mutation.reason,
          name: mutation.name,
          referenceDocumentUri: documentUri,
          changes: mutation.changes.map(({ inventoryItemId, locationId, delta }) => ({
            locationId,
            inventoryItemId,
            delta,
            ledgerDocumentUri: mutation.name === 'available' ? undefined : documentUri,
          })),
        },
      });
    }),
  );
}

function getInitiatorDocumentUri(initiator: InventoryMutationInitiator, mutationId: number) {
  const searchParams = new URLSearchParams({ mutationId: String(mutationId) });
  return `workmate://${encodeURIComponent(initiator.type)}/${encodeURIComponent(initiator.name)}?${searchParams.toString()}`;
}

/**
 * {@link https://shopify.dev/docs/apps/build/orders-fulfillment/inventory-management-apps/manage-quantities-states#set-inventory-quantities-on-hand}
 */
export type InventoryMutationReason =
  | 'correction'
  | 'cycle_count_available'
  | 'damaged'
  | 'movement_created'
  | 'movement_updated'
  | 'movement_received'
  | 'movement_canceled'
  | 'other'
  | 'promotion'
  | 'quality_control'
  | 'received'
  | 'reservation_created'
  | 'reservation_deleted'
  | 'reservation_updated'
  | 'restock'
  | 'safety_stock'
  | 'shrinkage';

/**
 * {@link https://shopify.dev/docs/apps/fulfillment/inventory-management-apps#inventory-states}
 */
export type InventoryState =
  | 'incoming'
  | 'available'
  | 'committed'
  | 'reserved'
  | 'damaged'
  | 'safety_stock'
  | 'quality_control';

/**
 * What caused the inventory change.
 * Linked in the WorkMate Inventory Adjustment log.
 */
export type InventoryMutationInitiator =
  | {
      type: 'purchase-order';
      name: string;
    }
  | {
      type: 'purchase-order-receipt';
      name: string;
    }
  | {
      type: 'stock-transfer';
      name: string;
    }
  | {
      type: 'cycle-count';
      name: string;
    }
  | {
      type: 'work-order';
      name: string;
    }
  | {
      type: 'unknown';
      name: 'unknown';
    };

/**
 * Move between inventory quantities at the same location.
 * Should be used to move from incoming to available, etc.
 */
export type MoveInventoryQuantities = {
  type: 'move';
  initiator: InventoryMutationInitiator;
  reason: InventoryMutationReason;
  changes: {
    locationId: ID;
    inventoryItemId: ID;
    quantity: number;
    from: InventoryState;
    to: InventoryState;
  }[];
};

export type SetInventoryQuantities = {
  type: 'set';
  initiator: InventoryMutationInitiator;
  reason: InventoryMutationReason;
  name: InventoryState & ('available' | 'on_hand');
  changes: {
    locationId: ID;
    inventoryItemId: ID;
    /**
     * The quantity before the change.
     * Is provided to Shopify to ensure that the quantity has not changed since the last time we fetched the inventory,
     * ensuring atomicity.
     */
    compareQuantity: number;
    quantity: number;
  }[];
};

export type AdjustInventoryQuantities = {
  type: 'adjust';
  initiator: InventoryMutationInitiator;
  reason: InventoryMutationReason;
  name: InventoryState;
  changes: {
    inventoryItemId: ID;
    locationId: ID;
    delta: number;
  }[];
};

export type MutateInventoryQuantities = MoveInventoryQuantities | SetInventoryQuantities | AdjustInventoryQuantities;
