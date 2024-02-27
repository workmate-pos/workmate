import { gql } from './gql/gql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { getShopPlanType } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';

export type Shop = gql.shop.getShop.Result['shop'];
const shopCache = new Map<string, Shop>();

export async function getShopType(graphql: Graphql) {
  const shopStr = graphql.session.shop;

  let shop = shopCache.get(shopStr);
  if (shop == null) {
    shop = await gql.shop.getShop.run(graphql, {}).then(res => res.shop);
  }

  if (shop == null) throw new Error('Shop not found');
  shopCache.set(shopStr, shop);

  const type = getShopPlanType(shop.plan);

  if (type === null) {
    throw new HttpError('Unknown shop plan type', 500);
  }

  return type;
}
