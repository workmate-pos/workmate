import { ShopSettings } from '../schemas/generated/shop-settings.js';
import { getSettingsByShop } from './settings.js';
import { prisma } from './prisma.js';

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
  const settings = await getSettingsByShop(shop);

  let formattedId = settings.idFormat;

  for (const [key, formatter] of Object.entries(formatters)) {
    const template = `{${key}}`;
    if (formattedId.includes(template)) {
      const value = await formatter({ shop, settings });
      formattedId = formattedId.replace(template, value);
    }
  }

  return formattedId;
}

async function getNextIdForShop(shop: string) {
  await createIdSequenceForShopIfNotExists(shop);
  const [{ id }] = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `SELECT NEXTVAL('"${getShopIdSequenceName(shop)}"') :: INTEGER AS "id";`,
  );

  if (Number.isNaN(id)) {
    throw new Error('Unexpected non-number id');
  }

  return id;
}

async function createIdSequenceForShopIfNotExists(shop: string) {
  await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS "${getShopIdSequenceName(shop)}" AS INTEGER;`);
}

function getShopIdSequenceName(shop: string) {
  return `IdSeq_${shop}`;
}
