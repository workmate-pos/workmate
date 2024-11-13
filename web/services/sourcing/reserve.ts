import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getShopifyOrderLineItem } from '../orders/queries.js';
import {
  createOrIncrementShopifyOrderLineItemReservation,
  removeShopifyOrderLineItemReservation,
  getShopifyOrderLineItemReservations,
} from './queries.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { Session } from '@shopify/shopify-api';
import { gql } from '../gql/gql.js';
import { unit } from '../db/unit-of-work.js';
import { isLineItemId } from '../../util/assertions.js';
import { InventoryMutationInitiator, mutateInventoryQuantities } from '../inventory/adjust.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';

/**
 * Moves inventory stock from "available" to "reserved" for a given line item.
 */
export async function reserveLineItemQuantity(
  session: Session,
  user: LocalsTeifiUser,
  initiator: InventoryMutationInitiator,
  locationId: ID,
  lineItemId: ID,
  quantity: number,
) {
  if (isLineItemId(lineItemId)) {
    // only draft order line items can be reserved because order line items automatically put inventory in the 'committed' stage already
    return;
  }

  const inventoryItemId = await getLineItemInventoryItemId(session, lineItemId);

  if (!inventoryItemId) {
    throw new HttpError('Line item must be a product', 404);
  }

  await mutateInventoryQuantities(session, {
    type: 'move',
    reason: 'reservation_created',
    initiator,
    staffMemberId: user.staffMember.id,
    changes: [
      {
        quantity,
        inventoryItemId,
        locationId,
        from: 'available',
        to: 'reserved',
      },
    ],
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
    return null;
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

  if (!inventoryItemId) {
    return;
  }

  if (!reservations.length) {
    return;
  }

  await mutateInventoryQuantities(session, {
    type: 'move',
    initiator: {
      // TODO: Add this to reservation table
      type: 'unknown',
      name: 'unknown',
    },
    reason: 'reservation_deleted',
    staffMemberId: null,
    changes: reservations.map(({ quantity, locationId }) => ({
      locationId,
      inventoryItemId,
      quantity,
      from: 'reserved',
      to: 'available',
    })),
  });
}
