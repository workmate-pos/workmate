import { gql } from './gql/gql.js';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { getShopPlanType } from '@teifi-digital/shopify-app-toolbox/shopify';

export type Shop = gql.shop.getShop.Result['shop'];
const shopCache = new Map<string, Shop>();
const unknownShopPlans = new Set<string>();

export async function getShopType(graphql: Graphql) {
  const shopStr = graphql.session.shop;

  let shop = shopCache.get(shopStr);
  if (shop == null) {
    shop = await gql.shop.getShop.run(graphql, {}).then(res => res.shop);
  }

  if (shop == null) throw new Error('Shop not found');
  shopCache.set(shopStr, shop);

  const type = getShopPlanType(shop.plan);

  if (type == null && !unknownShopPlans.has(shop.plan.displayName)) {
    unknownShopPlans.add(shop.plan.displayName);
    sentryErr('Encountered unknown Shopify shop plan', { shop });
  }

  return type;
}

export async function hasReadUsersScope(graphql: Graphql): Promise<boolean> {
  return false;
  // const shopType = await getShopType(graphql);
  // if (shopType == null) return false;
  // return ['ADVANCED_SHOPIFY', 'PARTNER_DEVELOPMENT', 'SHOPIFY_PLUS', 'SHOPIFY_PLUS_PARTNER_SANDBOX'].includes(shopType);
}
