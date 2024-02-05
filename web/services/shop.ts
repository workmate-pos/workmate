import { gql } from './gql/gql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';

export type Shop = gql.shop.getShop.Result['shop'];
export type ShopType = 'BASIC' | 'ADVANCED' | 'SHOPIFY_PLUS' | 'PARTNER_DEVELOPMENT';
const shopCache = new Map<string, Shop>();

export async function getShopType(graphql: Graphql): Promise<ShopType> {
  const shopStr = graphql.session.shop;

  let shop = shopCache.get(shopStr);
  if (shop == null) {
    shop = await gql.shop.getShop.run(graphql, {}).then(res => res.shop);
  }
  if (shop == null) throw new Error('Shop not found');
  shopCache.set(shopStr, shop);

  if (shop.plan.partnerDevelopment) return 'PARTNER_DEVELOPMENT';
  if (shop.plan.shopifyPlus) return 'SHOPIFY_PLUS';
  if (isAdvancedPlan(shop)) return 'ADVANCED';
  return 'BASIC';
}

export function isAdvancedPlan(shop: Shop): boolean {
  return shop.plan.displayName.toLowerCase().includes('advanced');
}
