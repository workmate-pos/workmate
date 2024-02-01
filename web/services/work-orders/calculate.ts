import { Session } from '@shopify/shopify-api';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { getOrderInput, getOrderOptions } from './order.js';
import { gql } from '../gql/gql.js';
import { getProductVariants } from './product-variants.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { sentryErr } from '@teifi-digital/shopify-app-express/services/sentry.js';

export async function calculateDraftOrder(session: Session, calculateWorkOrder: CalculateWorkOrder) {
  const graphql = new Graphql(session);
  const options = await getOrderOptions(session.shop);
  const productVariants = await getProductVariants(session, calculateWorkOrder);
  const input = getOrderInput('calculate', { ...calculateWorkOrder, description: '' }, options, productVariants);

  const result = await gql.draftOrder.calculate.run(graphql, { input }).then(r => r.draftOrderCalculate);

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
