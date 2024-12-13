import { Session } from '@shopify/shopify-api';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { GraphqlUserErrors, HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getNewPurchaseOrderName } from '../id-formatting.js';
import { unit } from '../db/unit-of-work.js';
import { getDetailedPurchaseOrder } from './get.js';
import { gql } from '../gql/gql.js';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { sendPurchaseOrderWebhook } from './webhook.js';
import {
  hasNestedPropertyValue,
  hasNonNullableProperty,
  hasPropertyValue,
  isNonNullable,
} from '@teifi-digital/shopify-app-toolbox/guards';
import { ensureProductVariantsExist } from '../product-variants/sync.js';
import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { DetailedPurchaseOrder } from './types.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ensureLocationsExist } from '../locations/sync.js';
import { ensureStaffMembersExist } from '../staff-members/sync.js';
import { getAverageUnitCostForProductVariant } from './average-unit-cost.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import {
  insertPurchaseOrderAssignedEmployees,
  insertPurchaseOrderCustomFields,
  insertPurchaseOrderLineItemCustomFields,
  deletePurchaseOrderAssignedEmployees,
  deletePurchaseOrderCustomFields,
  deletePurchaseOrderLineItemCustomFields,
  deletePurchaseOrderLineItemsByUuids,
  upsertPurchaseOrderLineItems,
  upsertPurchaseOrder,
  getPurchaseOrdersForSerial,
  getPurchaseOrderLineItemsForSpecialOrders,
} from './queries.js';
import { getProducts } from '../products/queries.js';
import { getSpecialOrderLineItemsByNameAndUuids, getSpecialOrdersByNames } from '../special-orders/queries.js';
import { httpError } from '../../util/http-error.js';
import { getProductVariants } from '../product-variants/queries.js';
import { getSerialsByProductVariantSerials, upsertSerials } from '../serials/queries.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';
import { assertLocationsPermitted } from '../franchises/assert-locations-permitted.js';
import { syncInventoryQuantities } from '../inventory/sync.js';
import { AdjustInventoryQuantities, mutateInventoryQuantities } from '../inventory/adjust.js';

export async function upsertCreatePurchaseOrder(
  session: Session,
  user: LocalsTeifiUser,
  createPurchaseOrder: CreatePurchaseOrder,
) {
  if (!createPurchaseOrder.locationId) {
    throw new HttpError('Location is required', 400);
  }

  const { shop } = session;

  await assertLocationsPermitted({
    shop: session.shop,
    locationIds: [createPurchaseOrder.locationId],
    staffMemberId: user.staffMember.id,
  });

  return await unit(async () => {
    const existingPurchaseOrder = createPurchaseOrder.name
      ? await getDetailedPurchaseOrder(session, createPurchaseOrder.name, user.user.allowedLocationIds)
      : null;

    if (createPurchaseOrder.name && !existingPurchaseOrder) {
      throw new HttpError('Purchase order not found', 404);
    }

    assertNoIllegalPurchaseOrderChanges(createPurchaseOrder, existingPurchaseOrder);
    assertNoIllegalLineItems(createPurchaseOrder, existingPurchaseOrder);
    assertNoIllegalLineItemChanges(createPurchaseOrder, existingPurchaseOrder);

    const productVariantIds = createPurchaseOrder.lineItems.map(({ productVariantId }) => productVariantId);
    const locationIds = [createPurchaseOrder.locationId].filter(isNonNullable);
    const employeeIds = createPurchaseOrder.employeeAssignments.map(({ employeeId }) => employeeId);

    await Promise.all([
      ensureProductVariantsExist(session, productVariantIds),
      ensureLocationsExist(session, locationIds),
      ensureStaffMembersExist(session, employeeIds),
      assertAllSameVendor(createPurchaseOrder),
      assertValidSpecialOrderLineItems(shop, createPurchaseOrder, existingPurchaseOrder),
    ]);

    const name = createPurchaseOrder.name ?? (await getNewPurchaseOrderName(shop));

    const { id: purchaseOrderId } = await upsertPurchaseOrder({
      ...createPurchaseOrder,
      shop,
      name,
      staffMemberId: existingPurchaseOrder?.staffMemberId ?? user.staffMember.id,
    });

    const specialOrderLineItemNameUuids = createPurchaseOrder.lineItems
      .map(lineItem => lineItem.specialOrderLineItem)
      .filter(isNonNullable);

    const lineItemSerials = createPurchaseOrder.lineItems
      .map(lineItem => ({
        productVariantId: lineItem.productVariantId,
        serial: lineItem.serialNumber,
        locationId: createPurchaseOrder.locationId ?? never('checked this above'),
        customerId: null,
        note: '',
        sold: false,
      }))
      .filter(hasNonNullableProperty('serial'));

    const existingLineItemUuids = new Set(existingPurchaseOrder?.lineItems.map(li => li.uuid) ?? []);
    const createLineItemUuids = new Set(createPurchaseOrder.lineItems.map(li => li.uuid));
    const uuidsToRemove = [...existingLineItemUuids].filter(oldUuid => !createLineItemUuids.has(oldUuid));

    const [specialOrderLineItems, serials] = await Promise.all([
      getSpecialOrderLineItemsByNameAndUuids(shop, specialOrderLineItemNameUuids),
      upsertSerials(shop, lineItemSerials).then(() => getSerialsByProductVariantSerials(shop, lineItemSerials)),
      deletePurchaseOrderLineItemsByUuids(purchaseOrderId, uuidsToRemove),
      deletePurchaseOrderCustomFields({ purchaseOrderIds: [purchaseOrderId] }),
      deletePurchaseOrderLineItemCustomFields({ purchaseOrderIds: [purchaseOrderId] }),
      deletePurchaseOrderAssignedEmployees({ purchaseOrderIds: [purchaseOrderId] }),
    ]);

    await assertNoIllegalSerials(shop, createPurchaseOrder, existingPurchaseOrder);

    await Promise.all([
      upsertPurchaseOrderLineItems(
        purchaseOrderId,
        createPurchaseOrder.lineItems.map(lineItem => ({
          ...lineItem,
          specialOrderLineItemId: !lineItem.specialOrderLineItem
            ? null
            : (specialOrderLineItems
                .filter(hasPropertyValue('uuid', lineItem.specialOrderLineItem.uuid))
                .find(hasPropertyValue('specialOrderName', lineItem.specialOrderLineItem.name))?.id ??
              httpError('Special order line item not found', 400)),
          productVariantSerialId: !lineItem.serialNumber
            ? null
            : (serials
                .filter(hasPropertyValue('productVariantId', lineItem.productVariantId))
                .find(hasPropertyValue('serial', lineItem.serialNumber))?.id ?? httpError('Serial not found', 400)),
        })),
      ).then(() => insertPurchaseOrderLineItemCustomFields(purchaseOrderId, createPurchaseOrder.lineItems)),
      insertPurchaseOrderCustomFields(purchaseOrderId, createPurchaseOrder.customFields),
      insertPurchaseOrderAssignedEmployees(purchaseOrderId, createPurchaseOrder.employeeAssignments),
    ]);

    const newPurchaseOrder = (await getDetailedPurchaseOrder(session, name, locationIds)) ?? never('We just made it');

    // TODO: Does this work with receipts?? it better
    return {
      existingPurchaseOrder,
      newPurchaseOrder,
      name,
    };
  }).then(async ({ existingPurchaseOrder, newPurchaseOrder, name }) => {
    await Promise.all([
      adjustPurchaseOrderShopifyInventory(session, user, existingPurchaseOrder, newPurchaseOrder),
      adjustShopifyInventoryItemCosts(session, existingPurchaseOrder, newPurchaseOrder),
    ]);

    sendPurchaseOrderWebhook(session, name).catch(error => {
      sentryErr('Failed to send webhook', { error });
    });

    const inventoryItemIds = unique([
      ...(existingPurchaseOrder?.lineItems.map(li => li.productVariant.inventoryItemId) ?? []),
      ...newPurchaseOrder.lineItems.map(li => li.productVariant.inventoryItemId),
    ]);

    // we need to sync inventory quantities manually because shopify does not fire webhooks any except available
    // (and we need incoming quantity too for re-ordering)
    await syncInventoryQuantities(session, inventoryItemIds);

    return { name };
  });
}

function assertNoIllegalPurchaseOrderChanges(
  createPurchaseOrder: CreatePurchaseOrder,
  existingPurchaseOrder: DetailedPurchaseOrder | null,
) {
  if (!existingPurchaseOrder) {
    return;
  }

  if (
    existingPurchaseOrder.vendorName !== null &&
    createPurchaseOrder.vendorName !== existingPurchaseOrder.vendorName
  ) {
    throw new HttpError('Vendor name cannot be changed', 400);
  }

  if (existingPurchaseOrder.location !== null && createPurchaseOrder.locationId !== existingPurchaseOrder.location.id) {
    throw new HttpError('Location cannot be changed', 400);
  }
}

function assertNoIllegalLineItems(
  createPurchaseOrder: CreatePurchaseOrder,
  existingPurchaseOrder: DetailedPurchaseOrder | null,
) {
  const uuids = createPurchaseOrder.lineItems.map(li => li.uuid);

  if (unique(uuids).length !== uuids.length) {
    throw new HttpError('Duplicate line item uuids', 400);
  }

  for (const lineItem of createPurchaseOrder.lineItems) {
    const availableQuantity =
      existingPurchaseOrder?.receipts
        ?.flatMap(receipt => receipt.lineItems)
        .filter(hasPropertyValue('uuid', lineItem.uuid))
        .map(li => li.quantity)
        .reduce((a, b) => a + b, 0) ?? 0;

    if (lineItem.quantity < 0) {
      throw new HttpError('Quantity cannot be negative', 400);
    }

    if (lineItem.quantity < availableQuantity) {
      throw new HttpError('Line Item quantity cannot be less than receipt quantity', 400);
    }

    if (BigDecimal.fromMoney(lineItem.unitCost).compare(BigDecimal.ZERO) < 0) {
      throw new HttpError('Unit cost cannot be negative', 400);
    }
  }
}

/**
 * Asserts constraints related to changing line items:
 * - if #availableQuantity > 0: nothing can be changed except increasing quantity
 * - if #availableQuantity > 0: line items cannot be removed
 * - #availableQuantity cannot be lowered
 */
function assertNoIllegalLineItemChanges(
  createPurchaseOrder: CreatePurchaseOrder,
  existingPurchaseOrder: DetailedPurchaseOrder | null,
) {
  if (!existingPurchaseOrder) {
    return;
  }

  for (const oldLineItem of existingPurchaseOrder.lineItems) {
    const availableQuantity = existingPurchaseOrder.receipts
      .flatMap(receipt => receipt.lineItems)
      .filter(hasPropertyValue('uuid', oldLineItem.uuid))
      .map(li => li.quantity)
      .reduce((a, b) => a + b, 0);

    const newLineItem = createPurchaseOrder.lineItems.find(newLineItem => newLineItem.uuid === oldLineItem.uuid);

    if (!newLineItem) {
      if (availableQuantity > 0) {
        throw new HttpError('Cannot delete received line items that are added to receipts', 400);
      }

      continue;
    }

    if (availableQuantity > 0) {
      if (newLineItem.productVariantId !== oldLineItem.productVariant.id) {
        throw new HttpError('Cannot change product variant for (partially) received line items', 400);
      }

      if (
        newLineItem.specialOrderLineItem?.name !== oldLineItem.specialOrderLineItem?.name ||
        newLineItem.specialOrderLineItem?.uuid !== oldLineItem.specialOrderLineItem?.uuid
      ) {
        throw new HttpError('Cannot change linked special order line item for (partially) received line items', 400);
      }
    }
  }
}

/**
 * Adjusts `incoming` and `available` inventory quantity to reflect the purchase order.
 * Also updates `receipt` quantitiesto reflect the work order type (e.g. DROPSHIP should not be counted).
 */
export async function adjustPurchaseOrderShopifyInventory(
  session: Session,
  user: LocalsTeifiUser,
  oldPurchaseOrder: DetailedPurchaseOrder | null,
  newPurchaseOrder: DetailedPurchaseOrder,
) {
  const deltasByLocationByInventoryItemId: Record<'available' | 'incoming', Record<ID, Record<ID, number>>> = {
    available: {},
    incoming: {},
  };

  const transfers = [
    {
      purchaseOrder: oldPurchaseOrder,
      factor: -1 * (oldPurchaseOrder?.type === 'DROPSHIP' ? 0 : 1),
    },
    {
      purchaseOrder: newPurchaseOrder,
      factor: 1 * (newPurchaseOrder?.type === 'DROPSHIP' ? 0 : 1),
    },
  ].filter(hasNonNullableProperty('purchaseOrder'));

  for (const { purchaseOrder, factor } of transfers) {
    if (!purchaseOrder.location) {
      continue;
    }

    const incomingDeltasByInventoryItemId = (deltasByLocationByInventoryItemId.incoming[purchaseOrder.location.id] ??=
      {});

    for (const lineItem of purchaseOrder.lineItems) {
      const { productVariant, quantity } = lineItem;
      const { inventoryItemId } = productVariant;

      incomingDeltasByInventoryItemId[inventoryItemId] =
        (incomingDeltasByInventoryItemId[inventoryItemId] ?? 0) + quantity * factor;
    }

    const availableDeltasByInventoryItemId = (deltasByLocationByInventoryItemId.available[purchaseOrder.location.id] ??=
      {});

    for (const receipt of purchaseOrder.receipts) {
      if (receipt.status !== 'COMPLETED') {
        continue;
      }

      for (const { uuid, quantity } of receipt.lineItems) {
        const purchaseOrderLineItem = purchaseOrder.lineItems.find(lineItem => lineItem.uuid === uuid);

        // TODO: Ensure this is asserted when changing a PO
        if (!purchaseOrderLineItem) {
          sentryErr('Receipt line item not found', { receipt, uuid, purchaseOrder });
          continue;
        }

        availableDeltasByInventoryItemId[purchaseOrderLineItem.productVariant.inventoryItemId] =
          (availableDeltasByInventoryItemId[purchaseOrderLineItem.productVariant.inventoryItemId] ?? 0) +
          quantity * factor;
      }
    }
  }

  const incomingChanges: AdjustInventoryQuantities['changes'] = [];
  const availableChanges: AdjustInventoryQuantities['changes'] = [];

  for (const type of ['incoming', 'available'] as const) {
    for (const [locationId, deltasByInventoryItemId] of entries(deltasByLocationByInventoryItemId[type])) {
      for (const [inventoryItemId, delta] of entries(deltasByInventoryItemId)) {
        ({ incoming: incomingChanges, available: availableChanges })[type].push({
          locationId,
          inventoryItemId,
          delta,
        });
      }
    }
  }

  try {
    await Promise.all([
      mutateInventoryQuantities(session, {
        type: 'adjust',
        initiator: { type: 'purchase-order', name: newPurchaseOrder.name },
        reason: 'restock',
        name: 'incoming',
        changes: incomingChanges,
        staffMemberId: user.staffMember.id,
      }),
      mutateInventoryQuantities(session, {
        type: 'adjust',
        initiator: { type: 'purchase-order', name: newPurchaseOrder.name },
        reason: 'restock',
        name: 'available',
        changes: availableChanges,
        staffMemberId: user.staffMember.id,
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

async function assertAllSameVendor(createPurchaseOrder: CreatePurchaseOrder) {
  const productVariantIds = unique(createPurchaseOrder.lineItems.map(li => li.productVariantId));
  const productVariants = await getProductVariants(productVariantIds);
  const productIds = unique(productVariants.map(pv => pv.productId));
  const products = await getProducts(productIds);

  const vendors = products.map(pv => pv.vendor);

  if (unique(vendors).length > 1) {
    throw new HttpError('All products must have the same vendor', 400);
  }
}

async function assertValidSpecialOrderLineItems(
  shop: string,
  createPurchaseOrder: CreatePurchaseOrder,
  existingPurchaseOrder: DetailedPurchaseOrder | null,
) {
  const lineItemsWithLink = createPurchaseOrder.lineItems.filter(hasNonNullableProperty('specialOrderLineItem'));
  const specialOrderNames = unique(lineItemsWithLink.map(li => li.specialOrderLineItem.name));

  const [[specialOrders, specialOrderPurchaseOrderLineItems], specialOrderLineItems] = await Promise.all([
    getSpecialOrdersByNames(shop, specialOrderNames).then(
      async specialOrders =>
        [specialOrders, await getPurchaseOrderLineItemsForSpecialOrders(specialOrders.map(spo => spo.id))] as const,
    ),
    getSpecialOrderLineItemsByNameAndUuids(
      shop,
      lineItemsWithLink.map(lineItem => lineItem.specialOrderLineItem),
    ),
  ]);

  if (specialOrderLineItems.length !== lineItemsWithLink.length) {
    throw new HttpError('Unknown special order line item(s)', 400);
  }

  for (const lineItem of specialOrderLineItems) {
    const specialOrderName = specialOrders.find(hasPropertyValue('id', lineItem.specialOrderId))?.name ?? never('fk');

    const createPurchaseOrderQuantity = lineItemsWithLink
      .filter(hasNestedPropertyValue('specialOrderLineItem.uuid', lineItem.uuid))
      .filter(hasNestedPropertyValue('specialOrderLineItem.name', specialOrderName))
      .map(lineItem => lineItem.quantity)
      .reduce((a, b) => a + b, 0);

    const existingPurchaseOrderQuantity =
      existingPurchaseOrder?.lineItems
        .filter(hasNestedPropertyValue('specialOrderLineItem.uuid', lineItem.uuid))
        .filter(hasNestedPropertyValue('specialOrderLineItem.name', specialOrderName))
        .map(lineItem => lineItem.quantity)
        .reduce((a, b) => a + b, 0) ?? 0;

    const purchaseOrderQuantity = specialOrderPurchaseOrderLineItems
      .filter(hasPropertyValue('specialOrderLineItemId', lineItem.id))
      .map(poli => poli.quantity)
      .reduce((a, b) => a + b, 0);

    // PO quantity must be LTE linked SPO quantity
    if (purchaseOrderQuantity - existingPurchaseOrderQuantity + createPurchaseOrderQuantity > lineItem.quantity) {
      throw new HttpError('Cannot use more special order line item quantity than requested', 400);
    }
  }
}

/**
 * Updates the Inventory Item cost for each product in this purchase order to the average cost of this product over all time
 */
async function adjustShopifyInventoryItemCosts(
  session: Session,
  oldPurchaseOrder: DetailedPurchaseOrder | null,
  newPurchaseOrder: DetailedPurchaseOrder,
) {
  const graphql = new Graphql(session);

  const productVariantIds = unique(
    [...(oldPurchaseOrder?.lineItems ?? []), ...newPurchaseOrder.lineItems].map(({ productVariant }) => {
      const productVariantId = productVariant.id;
      assertGid(productVariantId);
      return productVariantId;
    }),
  );

  const productVariants = await getProductVariants(productVariantIds);

  if (productVariantIds.length !== productVariants.length) {
    sentryErr('Failed to get all product variants', {
      oldProductVariantIds: oldPurchaseOrder?.lineItems.map(li => li.productVariant.id),
      newProductVariantIds: newPurchaseOrder.lineItems.map(li => li.productVariant.id),
      foundProductVariantIds: productVariants.map(pv => pv.productVariantId),
    });
  }

  const processProductVariant = async ({
    productVariantId,
    inventoryItemId,
  }: {
    productVariantId: ID;
    inventoryItemId: ID;
  }) => {
    const averageCost = await getAverageUnitCostForProductVariant(session.shop, productVariantId);

    await gql.inventoryItems.updateInventoryItem.run(graphql, {
      id: inventoryItemId,
      input: { cost: averageCost.toDecimal() },
    });
  };

  return await Promise.all(productVariants.map(processProductVariant));
}

async function assertNoIllegalSerials(
  shop: string,
  createPurchaseOrder: CreatePurchaseOrder,
  oldPurchaseOrder: DetailedPurchaseOrder | null,
) {
  const existingUuids = new Set(oldPurchaseOrder?.lineItems.map(li => li.uuid) ?? []);
  const newLineItems = createPurchaseOrder.lineItems.filter(li => !existingUuids.has(li.uuid));

  const newSerialPurchaseOrders = await Promise.all(
    newLineItems.filter(hasNonNullableProperty('serialNumber')).map(async lineItem => ({
      lineItem,
      purchaseOrders: await getPurchaseOrdersForSerial({
        shop,
        serial: lineItem.serialNumber,
        productVariantId: lineItem.productVariantId,
        locationIds: null,
      }),
    })),
  ).then(result => result.filter(({ purchaseOrders }) => purchaseOrders.length > 0));

  if (newSerialPurchaseOrders.length > 0) {
    const offendingSerials = newSerialPurchaseOrders.map(({ lineItem }) => lineItem.serialNumber);
    throw new HttpError(
      `Serial numbers can only be received in one purchase order (${offendingSerials.join(', ')})`,
      400,
    );
  }
}
