import { getCount } from './queries.js';

export async function getCycleCountCountForShop(shop: string) {
  return await getCount(`cycle-count.${shop}`);
}
