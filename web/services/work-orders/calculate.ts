import { Session } from '@shopify/shopify-api';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../gql/gql.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services/sentry.js';
import { getWorkOrderLineItems, getCustomAttributeArrayFromObject } from '@work-orders/work-order-shopify-order';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';

export async function calculateDraftOrder(session: Session, calculateWorkOrder: CalculateWorkOrder) {
  const graphql = new Graphql(session);

  const { lineItems, customSales } = getWorkOrderLineItems(
    calculateWorkOrder.items,
    calculateWorkOrder.charges.filter(hasPropertyValue('type', 'hourly-labour')),
    calculateWorkOrder.charges.filter(hasPropertyValue('type', 'fixed-price-labour')),
  );

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

  const { totalPrice, totalShippingPrice, totalTax, subtotalPrice, appliedDiscount } = result.calculatedDraftOrder;

  return {
    totalPrice,
    totalShippingPrice,
    totalTax,
    subtotalPrice,
    appliedDiscount,
  };
}
