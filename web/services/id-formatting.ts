import { getShopSettings } from './settings/settings.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getCount } from './counter/queries.js';

type Formatters = Record<string, ({ shop }: { shop: string }) => Promise<string> | string>;

// TODO: Use liquid for this
const baseFormatters: Formatters = {
  // TODO: adjust to local timezone (timezone setting? take from shopify?)
  year: () => new Date().getFullYear().toString(),
  month: () => (new Date().getMonth() + 1).toString(),
  day: () => new Date().getDate().toString(),
  hour: () => new Date().getHours().toString(),
  minute: () => new Date().getMinutes().toString(),
};

const workOrderFormatters: Formatters = {
  ...baseFormatters,
  id: ({ shop }) => getCount(`work-order.${shop}`).then(String),
};

const purchaseOrderFormatters: Formatters = {
  ...baseFormatters,
  id: ({ shop }) => getCount(`purchase-order.${shop}`).then(String),
};

const stockTransferFormatters: Formatters = {
  ...baseFormatters,
  id: ({ shop }) => getCount(`stock-transfer.${shop}`).then(String),
};

const cycleCountFormatters: Formatters = {
  ...baseFormatters,
  id: ({ shop }) => getCount(`cycle-count.${shop}`).then(String),
};

const specialOrderFormatters: Formatters = {
  ...baseFormatters,
  id: ({ shop }) => getCount(`special-order.${shop}`).then(String),
};

const purchaseOrderReceiptFormatters: Formatters = {
  ...baseFormatters,
  id: ({ shop }) => getCount(`purchase-order-receipt.${shop}`).then(String),
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
  return await applyFormatters(settings.workOrders.idFormat, workOrderFormatters, { shop });
}

export async function getNewPurchaseOrderName(shop: string) {
  const settings = await getShopSettings(shop);
  return await applyFormatters(settings.purchaseOrders.idFormat, purchaseOrderFormatters, { shop });
}

export async function getNewTransferOrderName(shop: string) {
  const settings = await getShopSettings(shop);
  return await applyFormatters(settings.transferOrders.idFormat, stockTransferFormatters, { shop });
}

export async function getNewSpecialOrderName(shop: string): Promise<string> {
  const settings = await getShopSettings(shop);
  return await applyFormatters(settings.specialOrders.idFormat, specialOrderFormatters, { shop });
}

export async function getNewCycleCountName(shop: string) {
  const settings = await getShopSettings(shop);
  return await applyFormatters(settings.cycleCount.idFormat, cycleCountFormatters, { shop });
}

export async function getNewPurchaseOrderReceiptName(shop: string) {
  const settings = await getShopSettings(shop);
  return await applyFormatters(settings.purchaseOrders.receipts.idFormat, purchaseOrderReceiptFormatters, { shop });
}

export function assertValidFormatString(format: string) {
  if (!format.includes('{{id}}')) {
    throw new HttpError('Invalid id format string, must include {{id}}', 400);
  }
}
