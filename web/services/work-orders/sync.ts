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

export async function syncWorkOrders(session: Session, workOrderIds: number[], workOrderHasChanged: boolean) {
  if (workOrderIds.length === 0) {
    return;
  }

  const errors: unknown[] = [];

  for (const workOrderId of workOrderIds) {
    await syncWorkOrder(session, workOrderId, workOrderHasChanged).catch(error => errors.push(error));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync work orders');
  }
}

export async function syncWorkOrder(session: Session, workOrderId: number, workOrderHasChanged: boolean) {
  const { labourLineItemSKU } = await getShopSettings(session.shop);

  const [workOrder] = await db.workOrder.get({ id: workOrderId });

  if (!workOrder) {
    throw new Error(`Work order with id ${workOrderId} not found`);
  }

  const items = await db.workOrder.getItems({ workOrderId });
  const hourlyLabourCharges = await db.workOrderCharges.getHourlyLabourCharges({ workOrderId });
  const fixedPriceLabourCharges = await db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId });

  const staleLineItemIdFilter = (el: { shopifyOrderLineItemId: string | null }) => {
    if (isLineItemId(el.shopifyOrderLineItemId)) {
      return false;
    }

    if (el.shopifyOrderLineItemId === null) {
      return true;
    }

    // at this point we know that its a draft order line item.
    // we only want to re-create draft line items in case the work order has changed.
    // otherwise we would create a new draft order every time a draft order has changed via the webhook.
    if (workOrderHasChanged) {
      return true;
    }

    return false;
  };

  const draftItems = items.filter(staleLineItemIdFilter);
  const draftHourlyLabourCharges = hourlyLabourCharges.filter(staleLineItemIdFilter);
  const draftFixedPriceLabourCharges = fixedPriceLabourCharges.filter(staleLineItemIdFilter);

  if (draftItems.length === 0 && draftHourlyLabourCharges.length === 0 && draftFixedPriceLabourCharges.length === 0) {
    return;
  }

  const linkedOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId });
  const draftOrderIds = linkedOrders.filter(hasPropertyValue('orderType', 'DRAFT_ORDER')).map(({ orderId }) => {
    assertGid(orderId);
    return orderId;
  });

  const graphql = new Graphql(session);
  await gql.draftOrder.removeMany.run(graphql, { ids: draftOrderIds });

  const { lineItems, customSales } = getWorkOrderLineItems(
    draftItems,
    draftHourlyLabourCharges,
    draftFixedPriceLabourCharges,
    { labourSku: labourLineItemSKU },
  );

  assertGid(workOrder.customerId);

  await gql.draftOrder.create.run(graphql, {
    input: {
      customAttributes: getCustomAttributeArrayFromObject(getWorkOrderOrderCustomAttributes(workOrder)),
      lineItems: [
        ...lineItems.map(lineItem => ({
          variantId: lineItem.productVariantId,
          quantity: lineItem.quantity,
          customAttributes: getCustomAttributeArrayFromObject(lineItem.customAttributes),
        })),
        ...customSales.map(customSale => ({
          title: customSale.title,
          quantity: customSale.quantity,
          customAttributes: getCustomAttributeArrayFromObject(customSale.customAttributes),
          originalUnitPrice: customSale.unitPrice,
        })),
      ],
      note: workOrder.note,
      purchasingEntity: workOrder.customerId ? { customerId: workOrder.customerId } : null,
    },
  });
}

function isLineItemId(id: string | null): id is ID {
  return id !== null && parseGid(id).objectName === 'LineItem';
}
