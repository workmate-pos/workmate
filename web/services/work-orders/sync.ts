import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { gql } from '../gql/gql.js';
import { assertGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import {
  getCustomAttributeArrayFromObject,
  getWorkOrderLineItems,
  getWorkOrderOrderCustomAttributes,
} from '@work-orders/work-order-shopify-order';

export async function syncWorkOrders(session: Session, workOrderIds: number[]) {
  if (workOrderIds.length === 0) {
    return;
  }

  const errors: unknown[] = [];

  for (const workOrderId of workOrderIds) {
    await syncWorkOrder(session, workOrderId).catch(error => errors.push(error));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync work orders');
  }
}

export async function syncWorkOrder(session: Session, workOrderId: number) {
  const [workOrder] = await db.workOrder.get({ id: workOrderId });

  if (!workOrder) {
    throw new Error(`Work order with id ${workOrderId} not found`);
  }

  const unlinkedItems = await db.workOrder.getUnlinkedItems({ workOrderId });
  const unlinkedHourlyLabourCharges = await db.workOrder.getUnlinkedHourlyLabourCharges({ workOrderId });
  const unlinkedFixedPriceLabourCharges = await db.workOrder.getUnlinkedFixedPriceLabourCharges({ workOrderId });

  if (
    unlinkedItems.length === 0 &&
    unlinkedHourlyLabourCharges.length === 0 &&
    unlinkedFixedPriceLabourCharges.length === 0
  ) {
    return;
  }

  // Delete all existing draft order ids and recreate a new draft order containing all line items not associated with an order

  const linkedDraftOrderIds = await db.workOrder.getLinkedDraftOrderIds({ workOrderId });
  const draftOrderIds = linkedDraftOrderIds.map(({ orderId }) => {
    assertGid(orderId);
    return orderId;
  });

  const graphql = new Graphql(session);
  await gql.draftOrder.removeMany.run(graphql, { ids: draftOrderIds });

  const { lineItems, customSales } = getWorkOrderLineItems(
    unlinkedItems,
    unlinkedHourlyLabourCharges,
    unlinkedFixedPriceLabourCharges,
  );

  assertGid(workOrder.customerId);

  // TODO: Make discount work again - absolute discount should be applied once, but percentage on all orders - maybe just let the merchant do it natively?
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
          unitPrice: customSale.unitPrice,
        })),
      ],
      note: workOrder.note,
      purchasingEntity: workOrder.customerId,
    },
  });
}
