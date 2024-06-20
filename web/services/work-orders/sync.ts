import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { gql } from '../gql/gql.js';
import { assertGid, ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import {
  getCustomAttributeArrayFromObject,
  getWorkOrderLineItems,
  getWorkOrderOrderCustomAttributes,
} from '@work-orders/work-order-shopify-order';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { getShopSettings } from '../settings.js';
import { getWorkOrderDiscount } from './get.js';
import { syncShopifyOrders } from '../shopify-order/sync.js';
import { assertGidOrNull } from '../../util/assertions.js';
import { DraftOrderInput, Int } from '../gql/queries/generated/schema.js';

export type SyncWorkOrdersOptions = {
  /**
   * If true, work orders are only synced if there is some unlinked line item.
   * Defaults to false.
   *
   * This is used to break an infinite update cycle:
   * 1. Update Order webhook
   * 2. Sync Related Work Orders (in case something was deleted)
   * 3. Update Order webhook
   */
  onlySyncIfUnlinked?: boolean;

  /**
   * If true, updates the custom attributes of existing orders.
   * Defaults to true.
   */
  updateCustomAttributes?: boolean;
};

const defaultSyncWorkOrdersOptions: SyncWorkOrdersOptions = {
  onlySyncIfUnlinked: false,
  updateCustomAttributes: true,
};

export async function syncWorkOrders(session: Session, workOrderIds: number[], options?: SyncWorkOrdersOptions) {
  if (workOrderIds.length === 0) {
    return;
  }

  const errors: unknown[] = [];

  for (const workOrderId of workOrderIds) {
    await syncWorkOrder(session, workOrderId, options).catch(error => errors.push(error));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync work orders');
  }
}

/**
 * Syncs a work order to Shopify by creating a new draft order for any draft/unlinked line items, and updating custom attributes of existing orders.
 */
export async function syncWorkOrder(session: Session, workOrderId: number, options?: SyncWorkOrdersOptions) {
  const { labourLineItemSKU } = await getShopSettings(session.shop);

  const [workOrder] = await db.workOrder.getById({ id: workOrderId });

  if (!workOrder) {
    throw new Error(`Work order with id ${workOrderId} not found`);
  }

  const [customFields, items, customItems, hourlyLabourCharges, fixedPriceLabourCharges] = await Promise.all([
    db.workOrder.getCustomFields({ workOrderId }),
    db.workOrder.getItems({ workOrderId }),
    db.workOrder.getCustomItems({ workOrderId }),
    db.workOrderCharges.getHourlyLabourCharges({ workOrderId }),
    db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId }),
  ]);

  if (options?.onlySyncIfUnlinked ?? defaultSyncWorkOrdersOptions.onlySyncIfUnlinked) {
    const hasUnlinkedItems = [...items, ...hourlyLabourCharges, ...fixedPriceLabourCharges].some(
      el => el.shopifyOrderLineItemId === null,
    );

    if (!hasUnlinkedItems) {
      return;
    }
  }

  const graphql = new Graphql(session);

  const linkedOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId });

  const lineItemToLinkFilter = (el: { shopifyOrderLineItemId: string | null }) =>
    !isLineItemId(el.shopifyOrderLineItemId);

  const draftItems = items.filter(lineItemToLinkFilter);
  const draftCustomItems = customItems.filter(lineItemToLinkFilter);
  const draftHourlyLabourCharges = hourlyLabourCharges.filter(lineItemToLinkFilter);
  const draftFixedPriceLabourCharges = fixedPriceLabourCharges.filter(lineItemToLinkFilter);

  const mapWorkOrderItem = <T extends { workOrderItemUuid: string | null; workOrderCustomItemUuid: string | null }>(
    charge: T,
  ) => {
    const { workOrderCustomItemUuid, workOrderItemUuid, ...rest } = charge;

    if (workOrderItemUuid && workOrderCustomItemUuid) {
      // impossible by design of create-work-order.json
      throw new Error('Cannot have both workOrderItemUuid and workOrderCustomItemUuid');
    }

    return {
      ...charge,
      workOrderItem: workOrderItemUuid
        ? ({ type: 'product', uuid: workOrderItemUuid } as const)
        : workOrderCustomItemUuid
          ? ({ type: 'custom-item', uuid: workOrderCustomItemUuid } as const)
          : null,
    };
  };

  const { lineItems, customSales } = getWorkOrderLineItems(
    draftItems,
    draftCustomItems,
    draftHourlyLabourCharges.map(mapWorkOrderItem),
    draftFixedPriceLabourCharges.map(mapWorkOrderItem),
    { labourSku: labourLineItemSKU },
  );

  const discount = getWorkOrderDiscount(workOrder);

  assertGid(workOrder.customerId);

  const input = {
    customAttributes: getCustomAttributeArrayFromObject(
      getWorkOrderOrderCustomAttributes({
        name: workOrder.name,
        customFields: Object.fromEntries(customFields.map(({ key, value }) => [key, value])),
      }),
    ),
    lineItems: [
      ...lineItems.map(lineItem => ({
        variantId: lineItem.productVariantId,
        quantity: lineItem.quantity as Int,
        customAttributes: getCustomAttributeArrayFromObject(lineItem.customAttributes),
      })),
      ...customSales.map(customSale => ({
        title: customSale.title,
        quantity: customSale.quantity as Int,
        customAttributes: getCustomAttributeArrayFromObject(customSale.customAttributes),
        originalUnitPrice: customSale.unitPrice,
        taxable: customSale.taxable,
      })),
    ],
    note: workOrder.note,
    purchasingEntity: workOrder.customerId ? { customerId: workOrder.customerId } : null,
    appliedDiscount: discount ? { value: Number(discount.value), valueType: discount.type } : null,
  } as const satisfies DraftOrderInput;

  if (input.lineItems.length === 0) {
    // No line items, so we should delete all draft orders since draft orders don't support 0 line items.
    const draftOrderIds = linkedOrders.filter(hasPropertyValue('orderType', 'DRAFT_ORDER')).map(o => {
      assertGid(o.orderId);
      return o.orderId;
    });

    if (draftOrderIds.length > 0) {
      await gql.draftOrder.removeMany.run(graphql, { ids: draftOrderIds });
    }
  } else {
    const draftOrderId = linkedOrders.find(hasPropertyValue('orderType', 'DRAFT_ORDER'))?.orderId ?? null;

    assertGidOrNull(draftOrderId);

    const { result } = draftOrderId
      ? await gql.draftOrder.update.run(graphql, { id: draftOrderId, input })
      : await gql.draftOrder.create.run(graphql, { input });

    if (!result?.draftOrder) {
      throw new Error('Failed to create/update draft order');
    }

    await syncShopifyOrders(session, [result.draftOrder?.id]);
  }

  if (options?.updateCustomAttributes ?? defaultSyncWorkOrdersOptions.updateCustomAttributes) {
    await Promise.all(
      linkedOrders.filter(hasPropertyValue('orderType', 'ORDER')).map(order => {
        assertGid(order.orderId);

        return gql.order.updateCustomAttributes.run(graphql, {
          id: order.orderId,
          customAttributes: getCustomAttributeArrayFromObject(
            getWorkOrderOrderCustomAttributes({
              name: workOrder.name,
              customFields: Object.fromEntries(customFields.map(({ key, value }) => [key, value])),
            }),
          ),
        });
      }),
    );
  }
}

function isLineItemId(id: string | null): id is ID {
  return id !== null && parseGid(id).objectName === 'LineItem';
}
