import { CreateSpecialOrder } from '../../schemas/generated/create-special-order.js';
import { unit } from '../db/unit-of-work.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getNewSpecialOrderName } from '../id-formatting.js';
import { Session } from '@shopify/shopify-api';
import { ensureProductVariantsExist } from '../product-variants/sync.js';
import { ensureLocationsExist } from '../locations/sync.js';
import { ensureCustomersExist } from '../customer/sync.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ensureShopifyOrdersExist } from '../shopify-order/sync.js';
import { DetailedSpecialOrder } from './types.js';
import { getDetailedSpecialOrder } from './get.js';
import { removeSpecialOrderLineItemsExceptUuids, upsertSpecialOrder, upsertSpecialOrderLineItems } from './queries.js';
import { assertLocationsPermitted } from '../franchises/assert-locations-permitted.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';
import { httpError } from '../../util/http-error.js';

export async function upsertCreateSpecialOrder(
  session: Session,
  user: LocalsTeifiUser,
  createSpecialOrder: CreateSpecialOrder,
) {
  await assertLocationsPermitted({
    shop: session.shop,
    locationIds: [createSpecialOrder.locationId],
    staffMemberId: user.staffMember.id,
  });

  assertNoDuplicateLineItemUuids(createSpecialOrder);

  return await unit(async () => {
    const existingSpecialOrder = createSpecialOrder.name
      ? ((await getDetailedSpecialOrder(session, createSpecialOrder.name, user.user.allowedLocationIds)) ??
        httpError('Special order not found', 404))
      : null;

    const name = createSpecialOrder.name ?? (await getNewSpecialOrderName(session.shop));

    assertNoIllegalSpecialOrderChanges(createSpecialOrder, existingSpecialOrder);
    assertNoIllegalLineItemChanges(createSpecialOrder, existingSpecialOrder);

    const productVariantIds = unique(createSpecialOrder.lineItems.map(li => li.productVariantId));
    const orderIds = unique(
      createSpecialOrder.lineItems.map(li => li.shopifyOrderLineItem?.orderId).filter(isNonNullable),
    );

    // TODO: Central place for syncing all nodes - no need for multiple queries synce we can just use nodes() + __typename
    await Promise.all([
      ensureProductVariantsExist(session, productVariantIds),
      ensureLocationsExist(session, [createSpecialOrder.locationId]),
      ensureCustomersExist(session, [createSpecialOrder.customerId]),
      ensureShopifyOrdersExist(session, orderIds),
    ]);

    const { id: specialOrderId } = await upsertSpecialOrder({
      ...createSpecialOrder,
      shop: session.shop,
      name,
      requiredBy: createSpecialOrder.requiredBy ? new Date(createSpecialOrder.requiredBy) : null,
    });

    await Promise.all([
      removeSpecialOrderLineItemsExceptUuids(
        specialOrderId,
        createSpecialOrder.lineItems.map(li => li.uuid),
      ),
      upsertSpecialOrderLineItems(
        specialOrderId,
        createSpecialOrder.lineItems.map(lineItem => ({
          ...lineItem,
          shopifyOrderLineItemId: lineItem.shopifyOrderLineItem?.id ?? null,
        })),
      ),
    ]);

    return { name };
  });
}

function assertNoDuplicateLineItemUuids(createSpecialOrder: CreateSpecialOrder) {
  if (unique(createSpecialOrder.lineItems.map(li => li.uuid)).length !== createSpecialOrder.lineItems.length) {
    throw new HttpError('Duplicate line item uuids', 400);
  }
}

function assertNoIllegalSpecialOrderChanges(
  createSpecialOrder: CreateSpecialOrder,
  oldSpecialOrder: DetailedSpecialOrder | null,
) {
  if (!oldSpecialOrder) {
    return;
  }

  if (oldSpecialOrder.purchaseOrders.length === 0) {
    // if no purchase orders have been made we can change anything
    return;
  }

  if (createSpecialOrder.customerId !== oldSpecialOrder.customer.id) {
    throw new HttpError('Cannot change customer', 400);
  }

  if (createSpecialOrder.companyId !== oldSpecialOrder.companyId) {
    throw new HttpError('Cannot change company', 400);
  }

  if (createSpecialOrder.companyLocationId !== oldSpecialOrder.companyLocationId) {
    throw new HttpError('Cannot change company location', 400);
  }

  if (createSpecialOrder.companyContactId !== oldSpecialOrder.companyContactId) {
    throw new HttpError('Cannot change company contact', 400);
  }

  if (createSpecialOrder.locationId !== oldSpecialOrder.location.id) {
    throw new HttpError('Cannot change location', 400);
  }
}

function assertNoIllegalLineItemChanges(
  createSpecialOrder: CreateSpecialOrder,
  oldSpecialOrder: DetailedSpecialOrder | null,
) {
  if (!oldSpecialOrder) {
    return;
  }

  if (oldSpecialOrder.purchaseOrders.length === 0) {
    // if no purchase orders have been made we can change anything
    return;
  }

  for (const oldLineItem of oldSpecialOrder.lineItems) {
    const newLineItem = createSpecialOrder.lineItems.find(hasPropertyValue('uuid', oldLineItem.uuid));

    if (oldLineItem.purchaseOrderLineItems.length === 0) {
      // if no purchase orders have been made we can change anything
      continue;
    }

    if (!newLineItem) {
      throw new HttpError('Cannot remove line items that have been linked to purchase orders', 400);
    }

    const linkedPurchaseOrderQuantity = sum(oldLineItem.purchaseOrderLineItems.map(lineItem => lineItem.quantity));

    if (newLineItem.quantity < linkedPurchaseOrderQuantity) {
      throw new HttpError(`Cannot decrease quantity below ordered quantity (${linkedPurchaseOrderQuantity})`, 400);
    }

    if (
      newLineItem.shopifyOrderLineItem?.id !== oldLineItem.shopifyOrderLineItem?.id ||
      newLineItem.shopifyOrderLineItem?.orderId !== oldLineItem.shopifyOrderLineItem?.orderId
    ) {
      throw new HttpError('Cannot change linked order line item', 400);
    }

    if (newLineItem.productVariantId !== oldLineItem.productVariantId) {
      throw new HttpError('Cannot change product variant', 400);
    }
  }
}
