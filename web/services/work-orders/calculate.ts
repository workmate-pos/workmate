import { Session } from '@shopify/shopify-api';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../gql/gql.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services/sentry.js';
import {
  getWorkOrderLineItems,
  getCustomAttributeArrayFromObject,
  LineItem,
  CustomSale,
} from '@work-orders/work-order-shopify-order';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { getShopSettings } from '../settings.js';
import { db } from '../db/db.js';
import { indexBy, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertMoney, BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

export async function calculateDraftOrder(
  session: Session,
  calculateWorkOrder: CalculateWorkOrder,
): Promise<Awaited<ReturnType<typeof calculate>> & { outstanding: Money; paid: Money; discount: Money }> {
  const { labourLineItemSKU } = await getShopSettings(session.shop);

  const hourlyCharges = calculateWorkOrder.charges.filter(hasPropertyValue('type', 'hourly-labour'));
  const fixedCharges = calculateWorkOrder.charges.filter(hasPropertyValue('type', 'fixed-price-labour'));
  const options = { labourSku: labourLineItemSKU };

  if (!calculateWorkOrder.name) {
    const { lineItems, customSales } = getWorkOrderLineItems(
      calculateWorkOrder.items,
      hourlyCharges,
      fixedCharges,
      options,
    );

    const calculated = await calculate(session, lineItems, customSales);

    return {
      ...calculated,
      outstanding: calculated.totalPrice,
      paid: BigDecimal.ZERO.toMoney(),
      discount: BigDecimal.ZERO.toMoney(),
    };
  }

  // if this is not a completely new work order, we must account for any existing line items.
  // we simply check the database for them, exclude them from calculateDraftOrder, and add them to the obtained prices

  const [workOrder] = await db.workOrder.get({ name: calculateWorkOrder.name });

  if (!workOrder) {
    throw new HttpError('Work order not found', 404);
  }

  const databaseItems = await db.workOrder.getItems({ workOrderId: workOrder.id });
  const databaseHourlyCharges = await db.workOrderCharges.getHourlyLabourCharges({ workOrderId: workOrder.id });
  const databaseFixedCharges = await db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId: workOrder.id });

  const draftItems = calculateWorkOrder.items.filter(
    item => !databaseItems.some(i => i.uuid === item.uuid && isLineItemId(i.shopifyOrderLineItemId)),
  );
  const draftHourlyCharges = hourlyCharges.filter(
    charge => !databaseHourlyCharges.some(c => c.uuid === charge.uuid && isLineItemId(c.shopifyOrderLineItemId)),
  );
  const draftFixedCharges = fixedCharges.filter(
    charge => !databaseFixedCharges.some(c => c.uuid === charge.uuid && isLineItemId(c.shopifyOrderLineItemId)),
  );

  const { lineItems, customSales } = getWorkOrderLineItems(draftItems, draftHourlyCharges, draftFixedCharges, options);

  const calculated = await calculate(session, lineItems, customSales);

  // we have calculated the price over the new items. next we will consider items that are in orders already
  const existingShopifyOrderLineItemIds = unique(
    [...databaseItems, ...databaseHourlyCharges, ...databaseFixedCharges]
      .map(el => el.shopifyOrderLineItemId)
      .filter(isLineItemId),
  );

  let paid = BigDecimal.ZERO;
  let discount = BigDecimal.ZERO;

  if (existingShopifyOrderLineItemIds.length) {
    const existingLineItems = await db.shopifyOrder.getLineItemsByIds({ lineItemIds: existingShopifyOrderLineItemIds });

    const orderIds = unique(existingLineItems.map(li => li.orderId));
    const existingOrders = orderIds.length ? await db.shopifyOrder.getMany({ orderIds }) : [];
    const existingOrdersByOrderId = indexBy(existingOrders, order => order.orderId);

    for (const lineItem of existingLineItems) {
      assertMoney(lineItem.totalTax);
      assertMoney(lineItem.unitPrice);
      assertMoney(lineItem.discountedUnitPrice);

      const lineItemOriginalPrice = BigDecimal.fromMoney(lineItem.unitPrice).multiply(
        BigDecimal.fromString(lineItem.quantity.toFixed(0)),
      );

      const lineItemSubtotalPrice = BigDecimal.fromMoney(lineItem.discountedUnitPrice).multiply(
        BigDecimal.fromString(lineItem.quantity.toFixed(0)),
      );

      const lineItemDiscount = lineItemOriginalPrice.subtract(lineItemSubtotalPrice);
      discount = discount.add(lineItemDiscount);

      const lineItemTotalPrice = lineItemSubtotalPrice.add(BigDecimal.fromMoney(lineItem.totalTax));

      const order = existingOrdersByOrderId[lineItem.orderId] ?? never();
      assertMoney(order.total);
      assertMoney(order.outstanding);

      const orderPaidPrice = BigDecimal.fromMoney(order.total).subtract(BigDecimal.fromMoney(order.outstanding));

      const lineItemPaidPrice = orderPaidPrice.multiply(lineItemTotalPrice).divide(BigDecimal.fromMoney(order.total));

      paid = paid.add(lineItemPaidPrice);

      // we do not include taxes in the subtotal
      calculated.subtotalPrice = BigDecimal.fromMoney(calculated.subtotalPrice).add(lineItemSubtotalPrice).toMoney();

      calculated.totalTax = BigDecimal.fromMoney(calculated.totalTax)
        .add(BigDecimal.fromMoney(lineItem.totalTax))
        .toMoney();

      calculated.totalPrice = BigDecimal.fromMoney(calculated.totalPrice).add(lineItemTotalPrice).toMoney();
    }
  }

  const outstanding = BigDecimal.fromMoney(calculated.totalPrice).subtract(paid);

  return {
    ...calculated,
    paid: paid.toMoney(),
    discount: discount.toMoney(),
    outstanding: outstanding.toMoney(),
  };
}

async function calculate(session: Session, lineItems: LineItem[], customSales: CustomSale[]) {
  const graphql = new Graphql(session);

  if (lineItems.length === 0 && customSales.length === 0) {
    return {
      totalPrice: BigDecimal.ZERO.toMoney(),
      totalTax: BigDecimal.ZERO.toMoney(),
      subtotalPrice: BigDecimal.ZERO.toMoney(),
    };
  }

  const result = await gql.draftOrder.calculate
    .run(graphql, {
      input: {
        lineItems: [
          ...lineItems.map(lineItem => ({
            variantId: lineItem.productVariantId,
            customAttributes: getCustomAttributeArrayFromObject(lineItem.customAttributes),
            quantity: lineItem.quantity,
          })),
          ...customSales.map(customSale => ({
            title: customSale.title,
            customAttributes: getCustomAttributeArrayFromObject(customSale.customAttributes),
            quantity: customSale.quantity,
            originalUnitPrice: customSale.unitPrice,
          })),
        ],
      },
    })
    .then(r => r.draftOrderCalculate);

  if (!result) {
    sentryErr('Draft order calculation failed - no result', { result });
    throw new HttpError('Calculation failed', 500);
  }

  if (result.userErrors.length) {
    sentryErr('Draft order calculation failed - user errors', { userErrors: result.userErrors });
    throw new HttpError('Calculation failed', 500);
  }

  if (!result.calculatedDraftOrder) {
    sentryErr('Draft order calculation failed - no body', { result });
    throw new HttpError('Calculation failed', 500);
  }

  const { totalPrice, totalTax, subtotalPrice } = result.calculatedDraftOrder;

  return {
    totalPrice,
    totalTax,
    subtotalPrice,
  };
}

function isLineItemId(id: string | null): id is ID {
  return id !== null && parseGid(id).objectName === 'LineItem';
}
