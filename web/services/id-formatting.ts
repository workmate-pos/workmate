import { ShopSettings } from '../schemas/generated/shop-settings.js';
import { getShopSettings } from './settings.js';
import { db } from './db/db.js';
import { useClient } from './db/client.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

const formatters: Record<
  string,
  ({ shop, settings }: { shop: string; settings: ShopSettings }) => Promise<string> | string
> = {
  id: ({ shop }) => getNextIdForShop(shop).then(String),
  // TODO: adjust to local timezone (timezone setting? take from shopify?)
  year: () => new Date().getFullYear().toString(),
  month: () => (new Date().getMonth() + 1).toString(),
  day: () => new Date().getDate().toString(),
  hour: () => new Date().getHours().toString(),
  minute: () => new Date().getMinutes().toString(),
};

export async function getFormattedId(shop: string) {
  const settings = await getShopSettings(shop);

  let formattedId = settings.idFormat;

  for (const [key, formatter] of Object.entries(formatters)) {
    const template = `{{${key}}}`;
    if (formattedId.includes(template)) {
      const value = await formatter({ shop, settings });
      formattedId = formattedId.replace(template, value);
    }
  }

  return formattedId;
}

async function getNextIdForShop(shop: string) {
  await createIdSequenceForShopIfNotExists(shop);
  const [{ id } = never('Sequence not found')] = await db.workOrder.getNextIdForShop({
    shopSequenceName: getShopIdSequenceName(shop),
  });

  return id;
}

async function createIdSequenceForShopIfNotExists(shop: string) {
  const query = `CREATE SEQUENCE IF NOT EXISTS "${getShopIdSequenceName(shop)}" AS INTEGER;`;

  using client = await useClient();
  await client.query(query);
}

function getShopIdSequenceName(shop: string) {
  return `IdSeq_${shop}`;
}
