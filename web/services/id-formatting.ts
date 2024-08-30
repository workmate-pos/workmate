import { getShopSettings } from './settings.js';
import { db } from './db/db.js';
import { useClient } from './db/client.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getCount } from './counter/queries.js';

type Formatters = Record<string, ({ shop }: { shop: string }) => Promise<string> | string>;

const baseFormatters: Formatters = {
  // TODO: adjust to local timezone (timezone setting? take from shopify?)
  year: () => new Date().getFullYear().toString(),
  month: () => (new Date().getMonth() + 1).toString(),
  day: () => new Date().getDate().toString(),
  hour: () => new Date().getHours().toString(),
  minute: () => new Date().getMinutes().toString(),
};

// TODO: Migrate all of these to new counter table

const workOrderFormatters: Formatters = {
  ...baseFormatters,
  id: ({ shop }) => getNextWorkOrderIdForShop(shop).then(String),
};

const purchaseOrderFormatters: Formatters = {
  ...baseFormatters,
  id: ({ shop }) => getNextPurchaseOrderIdForShop(shop).then(String),
};

const stockTransferFormatters: Formatters = {
  ...baseFormatters,
  id: ({ shop }) => getNextStockTransferIdForShop(shop).then(String),
};

const cycleCountFormatters: Formatters = {
  ...baseFormatters,
  id: ({ shop }) => getCount(`cycle-count.${shop}`).then(String),
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
  return await applyFormatters(settings.idFormat, workOrderFormatters, { shop });
}

export async function getNewPurchaseOrderName(shop: string) {
  const settings = await getShopSettings(shop);
  return await applyFormatters(settings.purchaseOrderIdFormat, purchaseOrderFormatters, { shop });
}

export async function getNewStockTransferName(shop: string) {
  const settings = await getShopSettings(shop);
  return await applyFormatters(settings.stockTransferIdFormat, stockTransferFormatters, { shop });
}

export async function getNewSpecialOrderName(shop: string): Promise<string> {
  // TODO: id format
  // TODO: merge with counter
  return `SO-${Math.round(Math.random() * 100)}`;
}

export async function getNewCycleCountName(shop: string) {
  const settings = await getShopSettings(shop);
  return await applyFormatters(settings.cycleCount.idFormat, cycleCountFormatters, { shop });
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
