import { Session } from '@shopify/shopify-api';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { getOrderInput, getOrderOptions } from './order.js';
import { gql } from '../gql/gql.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getProductVariants } from './product-variants.js';

export async function calculateDraftOrder(session: Session, calculateWorkOrder: CalculateWorkOrder) {
  const graphql = new Graphql(session);
  const options = await getOrderOptions(session.shop);
  const productVariants = await getProductVariants(session, calculateWorkOrder);
  const input = getOrderInput('calculate', { ...calculateWorkOrder, description: '' }, options, productVariants);

  const result = await gql.draftOrder.calculate.run(graphql, { input }).then(r => r.draftOrderCalculate);

  if (!result) {
    throw new Error('Invalid result');
  }

  if (result.userErrors.length) {
    throw new Error(result.userErrors.map(e => `${e.field}: ${e.message}`).join('\n'));
  }

  const { totalPrice, totalShippingPrice, totalTax, subtotalPrice, appliedDiscount } =
    result.calculatedDraftOrder ?? never();

  return {
    totalPrice,
    totalShippingPrice,
    totalTax,
    subtotalPrice,
    appliedDiscount,
  };
}
