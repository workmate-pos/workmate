import { ShopSettings } from '../schemas/generated/shop-settings.js';
import { getShopSettings } from './settings.js';
import { db } from './db/db.js';
import { useClient } from './db/client.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';

const workOrderFormatters: Record<
  string,
  ({ shop, settings }: { shop: string; settings: ShopSettings }) => Promise<string> | string
> = {
  id: ({ shop }) => getNextWorkOrderIdForShop(shop).then(String),
  // TODO: adjust to local timezone (timezone setting? take from shopify?)
  year: () => new Date().getFullYear().toString(),
  month: () => (new Date().getMonth() + 1).toString(),
  day: () => new Date().getDate().toString(),
  hour: () => new Date().getHours().toString(),
  minute: () => new Date().getMinutes().toString(),
};

async function applyFormatters<Arg>(
  format: string,
  formatters: Record<string, (arg: Arg) => Promise<string> | string>,
  arg: Arg,
) {
  assertValidFormatString(format);

  for (const [key, formatter] of Object.entries(formatters)) {
    const template = `{{${key}}}`;
    if (format.includes(template)) {
      const value = await formatter(arg);
      format = format.replace(template, value);
    }
  }

  return format;
}

export async function getNewWorkOrderName(shop: string) {
  const settings = await getShopSettings(shop);

  return await applyFormatters(settings.idFormat, workOrderFormatters, { shop, settings });
}

export async function getNewPurchaseOrderName(shop: string) {
  const format = 'PO-#{{id}}';
  assertValidFormatString(format);
  return format.replace('{{id}}', String(await getNextPurchaseOrderIdForShop(shop)));
}

async function getNextWorkOrderIdForShop(shop: string) {
  await createWorkOrderIdSequenceForShopIfNotExists(shop);
  const [{ id } = never('Sequence not found')] = await db.sequence.getNextSequenceValue({
    sequenceName: getWorkOrderIdSequenceNameForShop(shop),
  });

  return id;
}

async function createWorkOrderIdSequenceForShopIfNotExists(shop: string) {
  const query = `CREATE SEQUENCE IF NOT EXISTS "${getWorkOrderIdSequenceNameForShop(shop)}" AS INTEGER;`;

  using client = await useClient();
  await client.query(query);
}

function getWorkOrderIdSequenceNameForShop(shop: string) {
  return `IdSeq_${shop}`;
}

async function getNextPurchaseOrderIdForShop(shop: string) {
  await createPurchaseOrderIdSequenceForShopIfNotExists(shop);
  const [{ id } = never('Sequence not found')] = await db.sequence.getNextSequenceValue({
    sequenceName: getPurchaseOrderIdSequenceNameForShop(shop),
  });

  return id;
}

async function createPurchaseOrderIdSequenceForShopIfNotExists(shop: string) {
  const query = `CREATE SEQUENCE IF NOT EXISTS "${getPurchaseOrderIdSequenceNameForShop(shop)}" AS INTEGER;`;

  using client = await useClient();
  await client.query(query);
}

function getPurchaseOrderIdSequenceNameForShop(shop: string) {
  return `IdSeq_PO_${shop}`;
}

export function assertValidFormatString(format: string) {
  if (!format.includes('{{id}}')) {
    throw new HttpError('Invalid id format string, must include {{id}}', 400);
  }
}
