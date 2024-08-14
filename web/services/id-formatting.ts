import { getShopSettings } from './settings.js';
import { db } from './db/db.js';
import { useClient } from './db/client.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getWorkOrderTypeCount } from './work-orders/queries.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';

type Formatters<T = unknown> = Record<string, (t: T) => Promise<string> | string>;

const baseFormatters: Formatters = {
  // TODO: adjust to local timezone (timezone setting? take from shopify?)
  year: () => new Date().getFullYear().toString(),
  month: () => (new Date().getMonth() + 1).toString(),
  day: () => new Date().getDate().toString(),
  hour: () => new Date().getHours().toString(),
  minute: () => new Date().getMinutes().toString(),
};

const workOrderFormatters: Formatters<{ shop: string; type: string }> = {
  ...baseFormatters,
  id: ({ shop, type }) => getWorkOrderTypeCount({ shop, type }).then(String),
};

const purchaseOrderFormatters: Formatters<{ shop: string }> = {
  ...baseFormatters,
  id: ({ shop }) => getNextPurchaseOrderIdForShop(shop).then(String),
};

const stockTransferFormatters: Formatters<{ shop: string }> = {
  ...baseFormatters,
  id: ({ shop }) => getNextStockTransferIdForShop(shop).then(String),
};

async function applyFormatters<Arg>(format: string, formatters: Formatters<Arg>, arg: Arg) {
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

export async function getNewWorkOrderName(shop: string, type: string) {
  const settings = await getShopSettings(shop);

  const [workOrderType] = Object.entries(settings.workOrderTypes)
    .filter(([t]) => type === t)
    .map(type => type[1]);

  if (!workOrderType) {
    throw new HttpError(`Unknown work order type '${type}'`, 400);
  }

  return await applyFormatters(workOrderType.idFormat, workOrderFormatters, { shop, type });
}

export async function getNewPurchaseOrderName(shop: string) {
  const settings = await getShopSettings(shop);
  return await applyFormatters(settings.purchaseOrderIdFormat, purchaseOrderFormatters, { shop });
}

export async function getNewStockTransferName(shop: string) {
  const settings = await getShopSettings(shop);
  return await applyFormatters(settings.stockTransferIdFormat, stockTransferFormatters, { shop });
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

async function getNextStockTransferIdForShop(shop: string) {
  await createStockTransferIdSequenceForShopIfNotExists(shop);
  const [{ id } = never('Sequence not found')] = await db.sequence.getNextSequenceValue({
    sequenceName: getStockTransferIdSequenceNameForShop(shop),
  });

  return id;
}

async function createStockTransferIdSequenceForShopIfNotExists(shop: string) {
  const query = `CREATE SEQUENCE IF NOT EXISTS "${getStockTransferIdSequenceNameForShop(shop)}" AS INTEGER;`;

  using client = await useClient();
  await client.query(query);
}

function getStockTransferIdSequenceNameForShop(shop: string) {
  return `IdSeq_ST_${shop}`;
}

export function assertValidFormatString(format: string) {
  if (!format.includes('{{id}}')) {
    throw new HttpError('Invalid id format string, must include {{id}}', 400);
  }
}
