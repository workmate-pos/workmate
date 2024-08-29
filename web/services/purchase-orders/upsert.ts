import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { GraphqlUserErrors, HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getNewPurchaseOrderName } from '../id-formatting.js';
import { unit } from '../db/unit-of-work.js';
import { getDetailedPurchaseOrder } from './get.js';
import { Int, InventoryChangeInput } from '../gql/queries/generated/schema.js';
import { gql } from '../gql/gql.js';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { sendPurchaseOrderWebhook } from './webhook.js';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ensureProductVariantsExist } from '../product-variants/sync.js';
import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { DetailedPurchaseOrder } from './types.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ensureLocationsExist } from '../locations/sync.js';
import { ensureEmployeesExist } from '../employee/sync.js';
import { getAverageUnitCostForProductVariant } from './average-unit-cost.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import {
  insertPurchaseOrderAssignedEmployees,
  insertPurchaseOrderCustomFields,
  insertPurchaseOrderLineItemCustomFields,
  removePurchaseOrderAssignedEmployees,
  removePurchaseOrderCustomFields,
  removePurchaseOrderLineItemCustomFields,
  removePurchaseOrderLineItemsByUuids,
  upsertPurchaseOrderLineItems,
  upsertPurchaseOrder,
} from './queries.js';
import { getProducts, getProductVariants } from '../products/queries.js';
import { getSpecialOrderLineItemsByNameAndUuids, getSpecialOrdersByNames } from '../special-orders/queries.js';

export async function upsertCreatePurchaseOrder(session: Session, createPurchaseOrder: CreatePurchaseOrder) {
  const { shop } = session;

  return await unit(async () => {
    const name = createPurchaseOrder.name ?? (await getNewPurchaseOrderName(shop));

    const isNew = createPurchaseOrder.name === null;
    const existingPurchaseOrder = isNew ? null : await getDetailedPurchaseOrder(session, name);

    assertNoIllegalPurchaseOrderChanges(createPurchaseOrder, existingPurchaseOrder);
    assertNoIllegalLineItems(createPurchaseOrder);
    assertNoIllegalLineItemChanges(createPurchaseOrder, existingPurchaseOrder?.lineItems ?? []);

    const productVariantIds = createPurchaseOrder.lineItems.map(({ productVariantId }) => productVariantId);
    const locationIds = [createPurchaseOrder.locationId].filter(isNonNullable);
    const employeeIds = createPurchaseOrder.employeeAssignments.map(({ employeeId }) => employeeId);

    await Promise.all([
      ensureProductVariantsExist(session, productVariantIds),
      ensureLocationsExist(session, locationIds),
      ensureEmployeesExist(session, employeeIds),
      assertAllSameVendor(createPurchaseOrder),
      assertValidSpecialOrderLineItems(shop, createPurchaseOrder, existingPurchaseOrder),
    ]);

    const { id: purchaseOrderId } = await upsertPurchaseOrder({
      ...createPurchaseOrder,
      shop,
      name,
    });

    const newLineItemUuids = new Set(createPurchaseOrder.lineItems.map(li => li.uuid));
    const oldLineItemUuids = new Set(existingPurchaseOrder?.lineItems.map(li => li.uuid) ?? []);

    const uuids = [...oldLineItemUuids].filter(oldUuid => !newLineItemUuids.has(oldUuid));

    await Promise.all([
      removePurchaseOrderLineItemsByUuids(purchaseOrderId, uuids),
      removePurchaseOrderCustomFields(purchaseOrderId),
      removePurchaseOrderLineItemCustomFields(purchaseOrderId),
      removePurchaseOrderAssignedEmployees(purchaseOrderId),
    ]);

    await Promise.all([
      upsertPurchaseOrderLineItems(purchaseOrderId, createPurchaseOrder.lineItems).then(() =>
        insertPurchaseOrderLineItemCustomFields(purchaseOrderId, createPurchaseOrder.lineItems),
      ),
      insertPurchaseOrderCustomFields(purchaseOrderId, createPurchaseOrder.customFields),
      insertPurchaseOrderAssignedEmployees(purchaseOrderId, createPurchaseOrder.employeeAssignments),
    ]);

    const newPurchaseOrder = (await getDetailedPurchaseOrder(session, name)) ?? never('We just made it');

    await adjustShopifyInventory(session, existingPurchaseOrder, newPurchaseOrder);
    await adjustShopifyInventoryItemCosts(session, existingPurchaseOrder, newPurchaseOrder);

    sendPurchaseOrderWebhook(session, name).catch(error => {
      sentryErr('Failed to send webhook', { error });
    });

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

function assertNoIllegalLineItems(createPurchaseOrder: CreatePurchaseOrder) {
  const uuids = createPurchaseOrder.lineItems.map(li => li.uuid);

  if (unique(uuids).length !== uuids.length) {
    throw new HttpError('Duplicate line item uuids', 400);
  }

  for (const lineItem of createPurchaseOrder.lineItems) {
    if (lineItem.availableQuantity < 0) {
      throw new HttpError('Available quantity cannot be negative', 400);
    }

    if (lineItem.quantity < 0) {
      throw new HttpError('Quantity cannot be negative', 400);
    }

    if (lineItem.availableQuantity > lineItem.quantity) {
      throw new HttpError('Available quantity cannot be greater than quantity', 400);
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
  oldLineItems: DetailedPurchaseOrder['lineItems'][number][],
) {
  for (const oldLineItem of oldLineItems) {
    const newLineItem = createPurchaseOrder.lineItems.find(newLineItem => newLineItem.uuid === oldLineItem.uuid);

    if (!newLineItem) {
      if (oldLineItem.availableQuantity > 0) {
        throw new HttpError('Cannot delete (partially) received line items', 400);
      }

      continue;
    }

    // TODO: Maybe allow this again
    if (newLineItem.availableQuantity < oldLineItem.availableQuantity) {
      throw new HttpError('Cannot decrease available quantity', 400);
    }

    if (oldLineItem.availableQuantity > 0) {
      if (!BigDecimal.fromMoney(newLineItem.unitCost).equals(BigDecimal.fromMoney(oldLineItem.unitCost))) {
        throw new HttpError('Cannot change unit cost for (partially) received line items', 400);
      }

      if (newLineItem.quantity < oldLineItem.quantity) {
        throw new HttpError('Cannot decrease quantity for (partially) received line items', 400);
      }

      if (newLineItem.productVariantId !== oldLineItem.productVariant.id) {
        throw new HttpError('Cannot change product variant for (partially) received line items', 400);
      }

      if (newLineItem.productVariantId !== oldLineItem.productVariant.id) {
        throw new HttpError('Cannot change product variant for (partially) received line items', 400);
      }

      if (
        newLineItem.specialOrderLineItem?.uuid !== oldLineItem.specialOrderLineItem?.name ||
        newLineItem.specialOrderLineItem?.uuid !== oldLineItem.specialOrderLineItem?.uuid ||
        newLineItem.specialOrderLineItem?.quantity !== oldLineItem.specialOrderLineItem?.quantity
      ) {
        throw new HttpError('Cannot change linked special order line item for (partially) received line items', 400);
      }
    }
  }
}

/**
 * Creates an inventory adjustment to reflect the change in inventory due to the purchase order.
 */
async function adjustShopifyInventory(
  session: Session,
  oldPurchaseOrder: DetailedPurchaseOrder | null,
  newPurchaseOrder: DetailedPurchaseOrder,
) {
  const deltasByLocationByInventoryItemId: Record<ID, Record<ID, Record<'incoming' | 'available', number>>> = {};

  const transfers = [
    {
      purchaseOrder: oldPurchaseOrder,
      factor: -1,
    },
    {
      purchaseOrder: newPurchaseOrder,
      factor: 1,
    },
  ].filter(hasNonNullableProperty('purchaseOrder'));

  for (const { purchaseOrder, factor } of transfers) {
    if (!purchaseOrder.location) {
      continue;
    }

    const deltasByInventoryItemId = (deltasByLocationByInventoryItemId[purchaseOrder.location.id] ??= {});

    for (const lineItem of purchaseOrder.lineItems) {
      const { productVariant, availableQuantity, quantity } = lineItem;
      const { inventoryItemId } = productVariant;
      assertGid(inventoryItemId);

      const deltas = (deltasByInventoryItemId[inventoryItemId] ??= { incoming: 0, available: 0 });

      const transitQuantity = quantity - availableQuantity;

      if (transitQuantity) {
        deltas.incoming += transitQuantity * factor;
      }

      if (availableQuantity) {
        deltas.available += availableQuantity * factor;
      }
    }
  }

  const availableChanges: InventoryChangeInput[] = [];
  const incomingChanges: InventoryChangeInput[] = [];

  const ledgerDocumentUri = `workmate://purchase-order/${encodeURIComponent(newPurchaseOrder.name)}`;

  for (const [locationId, deltasByInventoryItemId] of entries(deltasByLocationByInventoryItemId)) {
    for (const [inventoryItemId, deltas] of entries(deltasByInventoryItemId)) {
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
    // TODO: Do the same for stock transfers?
    if (newPurchaseOrder.location) {
      // Ensure all inventory items are being tracked

      const locationId = newPurchaseOrder.location.id;
      const inventoryItemIds = unique(
        newPurchaseOrder.lineItems.map(lineItem => lineItem.productVariant.inventoryItemId),
      );

      await Promise.all(
        inventoryItemIds.map(inventoryItemId =>
          gql.inventory.activateItems.run(graphql, { locationId, inventoryItemId }),
        ),
      );
    }

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

async function assertAllSameVendor(createPurchaseOrder: CreatePurchaseOrder) {
  const productVariantIds = unique(createPurchaseOrder.lineItems.map(li => li.productVariantId));
  const productVariants = await getProductVariants(productVariantIds);
  const productIds = unique(productVariants.map(pv => pv.productId));
  const products = await getProducts(productIds);

  const vendors = products.map(pv => pv.vendor);

  if (unique(vendors).length !== vendors.length) {
    throw new HttpError('All products must have the same vendor', 400);
  }
}

async function assertValidSpecialOrderLineItems(
  shop: string,
  createPurchaseOrder: CreatePurchaseOrder,
  existingPurchaseOrder: DetailedPurchaseOrder | null,
) {
  const lineItemsWithLink = createPurchaseOrder.lineItems.map(li => li.specialOrderLineItem).filter(isNonNullable);
  const specialOrderNames = unique(lineItemsWithLink.map(li => li.name));

  const [specialOrders, specialOrderLineItems] = await Promise.all([
    getSpecialOrdersByNames(shop, specialOrderNames),
    getSpecialOrderLineItemsByNameAndUuids(shop, lineItemsWithLink),
  ]);

  if (specialOrderLineItems.length !== lineItemsWithLink.length) {
    throw new HttpError('Unknown special order line item(s)', 400);
  }

  for (const lineItem of specialOrderLineItems) {
    const specialOrderName = specialOrders.find(hasPropertyValue('id', lineItem.specialOrderId))?.name ?? never('fk');

    const createUsedQuantity = sum(
      lineItemsWithLink
        .filter(hasPropertyValue('uuid', lineItem.uuid))
        .filter(hasPropertyValue('name', specialOrderName))
        .map(lineItem => lineItem.quantity),
    );

    const existingUsedQuantity = sum(
      existingPurchaseOrder?.lineItems
        .map(lineItem => lineItem.specialOrderLineItem)
        .filter(isNonNullable)
        .filter(hasPropertyValue('name', specialOrderName))
        .map(lineItem => lineItem.quantity) ?? [],
    );

    const usedQuantity = sum(lineItem.purchaseOrderLineItems.map(poli => poli.quantity));

    if (usedQuantity - existingUsedQuantity + createUsedQuantity > lineItem.quantity) {
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

  const productVariants = productVariantIds.length
    ? await db.productVariants.getMany({ productVariantIds }).then(rows =>
        rows.map(row => {
          assertGid(row.productVariantId);
          assertGid(row.inventoryItemId);
          return {
            ...row,
            productVariantId: row.productVariantId,
            inventoryItemId: row.inventoryItemId,
          };
        }),
      )
    : [];

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
