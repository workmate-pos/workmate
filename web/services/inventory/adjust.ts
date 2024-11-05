import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { unit } from '../db/unit-of-work.js';
import { gql } from '../gql/gql.js';

/**
 * Adjust inventory quantities on Shopify and log to the WorkMate Inventory Adjustment log.
 */
export function mutateInventoryQuantities(session: Session, mutation: MutateInventoryQuantities) {
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

async function moveInventoryQuantities(session: Session, mutation: MoveInventoryQuantities) {
  const { shop } = session;
  const graphql = new Graphql(session);

  await unit(async () => {
    // TODO: Record in own database

    const documentUri = getInitiatorDocumentUri(mutation.initiator);

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
  });
}

async function setInventoryQuantities(session: Session, mutation: SetInventoryQuantities) {
  const { shop } = session;
  const graphql = new Graphql(session);

  await unit(async () => {
    // TODO: Record in own database

    const documentUri = getInitiatorDocumentUri(mutation.initiator);

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
  });
}

async function adjustInventoryQuantities(session: Session, mutation: AdjustInventoryQuantities) {
  const { shop } = session;
  const graphql = new Graphql(session);

  await unit(async () => {
    // TODO: Record in own database

    const documentUri = getInitiatorDocumentUri(mutation.initiator);

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
  });
}

function getInitiatorDocumentUri(initiator: InventoryMutationInitiator) {
  return `workmate://${encodeURIComponent(initiator.type)}/${encodeURIComponent(initiator.name)}`;
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
      type: 'stock-transfer';
      name: string;
    }
  | {
      type: 'cycle-count';
      name: string;
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
  name: InventoryState;
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

type AdjustInventoryQuantities = {
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
