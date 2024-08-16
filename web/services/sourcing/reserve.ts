import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getShopifyOrderLineItem } from '../orders/queries.js';
import {
  getShopifyOrderLineItemReservationsByIds,
  createOrIncrementShopifyOrderLineItemReservation,
  removeShopifyOrderLineItemReservation,
  getShopifyOrderLineItemReservations,
} from './queries.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { Session } from '@shopify/shopify-api';
import { gql } from '../gql/gql.js';
import { unit } from '../db/unit-of-work.js';

/**
 * Moves inventory stock from "available" to "reserved" for a given line item.
 */
export async function reserveLineItemQuantity(session: Session, locationId: ID, lineItemId: ID, quantity: number) {
  const inventoryItemId = await getLineItemInventoryItemId(session, lineItemId);

  const graphql = new Graphql(session);
  await gql.inventory.moveQuantities.run(graphql, {
    input: {
      reason: 'other',
      referenceDocumentUri: 'workmate://reserveLineItemQuantity',
      changes: [
        {
          quantity: quantity,
          inventoryItemId,
          from: { name: 'available', locationId },
          to: { name: 'reserved', locationId },
        },
      ],
    },
  });

  await createOrIncrementShopifyOrderLineItemReservation(lineItemId, locationId, quantity);
}

/**
 * Unreserve line item at all locations.
 */
export async function unreserveLineItem(session: Session, filter: { lineItemId: ID; locationId?: ID }) {
  await unit(async () => {
    await revertShopifyReservationQuantities(session, filter);
    await removeShopifyOrderLineItemReservation(filter);
  });
}

async function getLineItemInventoryItemId(session: Session, lineItemId: ID) {
  const shopifyOrderLineItem = await getShopifyOrderLineItem(lineItemId);

  if (!shopifyOrderLineItem) {
    throw new HttpError(`Line item ${lineItemId} not found`, 404);
  }

  const { productVariantId } = shopifyOrderLineItem;

  if (!productVariantId) {
    throw new HttpError('Line item must be a product', 404);
  }

  const graphql = new Graphql(session);
  const result = await gql.products.get.run(graphql, { id: productVariantId });

  if (!result.productVariant) {
    throw new HttpError('Product variant not found', 404);
  }

  return result.productVariant.inventoryItem.id;
}

async function revertShopifyReservationQuantities(
  session: Session,
  { lineItemId, locationId }: { lineItemId: ID; locationId?: ID },
) {
  const [inventoryItemId, reservations] = await Promise.all([
    getLineItemInventoryItemId(session, lineItemId),
    getShopifyOrderLineItemReservations({ locationId, lineItemId }),
  ]);

  if (!reservations.length) {
    return;
  }

  const graphql = new Graphql(session);
  await gql.inventory.moveQuantities.run(graphql, {
    input: {
      reason: 'other',
      referenceDocumentUri: 'workmate://unreserveLineItemAtLocation',
      changes: reservations.map(({ locationId, lineItemId, quantity }) => ({
        inventoryItemId,
        quantity,
        from: { name: 'reserved', locationId },
        to: { name: 'available', locationId },
      })),
    },
  });
}
