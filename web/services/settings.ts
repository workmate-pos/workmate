import { getDefaultShopSetting, getShopSettingKeys } from './settings/default-settings.js';
import { ShopSettings } from '../schemas/generated/shop-settings.js';
import { PartialShopSettings } from '../schemas/generated/partial-shop-settings.js';
import { db } from './db/db.js';
import { unit } from './db/unit-of-work.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { assertValidFormatString } from './id-formatting.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { Liquid } from 'liquidjs';

function serialize(value: ShopSettings[keyof ShopSettings]) {
  return JSON.stringify(value);
}

function deserialize(value: string): ShopSettings[keyof ShopSettings] {
  return JSON.parse(value);
}

export async function getShopSettings(shop: string): Promise<ShopSettings> {
  await insertDefaultSettingsIfNotExists(shop);
  const rows = await db.settings.get({ shop });
  return Object.fromEntries(
    getShopSettingKeys().map(key => {
      const row = rows.find(row => row.key === key) ?? never('just inserted!');
      return [key, deserialize(row.value)];
    }),
  ) as unknown as ShopSettings;
}

export function upsertSetting<const K extends keyof ShopSettings>(shop: string, key: K, value: ShopSettings[K]) {
  return db.settings.upsertSetting({ shop, key, value: serialize(value) });
}

export async function updateSettings(shop: string, partialShopSettings: PartialShopSettings) {
  const settings = await getShopSettings(shop);

  assertValidSettings({ ...settings, ...partialShopSettings });

  return await unit(async () => {
    const entries = Object.entries(partialShopSettings) as [
      keyof PartialShopSettings,
      PartialShopSettings[keyof PartialShopSettings],
    ][];

    return await Promise.all(entries.map(([key, value]) => upsertSetting(shop, key, value!)));
  });
}

export async function insertDefaultSettingsIfNotExists(shop: string) {
  await db.settings.insertSettingsIfNotExists({
    settings: getShopSettingKeys().map(key => ({
      shop,
      key,
      value: serialize(getDefaultShopSetting(key)),
    })),
  });
}

function assertValidSettings(settings: ShopSettings) {
  for (const idFormat of [
    ...Object.values(settings.workOrderTypes).map(type => type.idFormat),
    settings.purchaseOrderIdFormat,
  ]) {
    assertValidFormatString(idFormat);
  }

  for (const { defaultStatus, statuses } of [
    {
      defaultStatus: settings.defaultStatus,
      statuses: settings.statuses,
    },
    {
      defaultStatus: settings.defaultPurchaseOrderStatus,
      statuses: settings.purchaseOrderStatuses,
    },
  ]) {
    if (!statuses.includes(defaultStatus)) {
      throw new HttpError('Invalid default status', 400);
    }

    if (unique(statuses).length !== statuses.length) {
      throw new HttpError('Duplicate statuses are not allowed', 400);
    }

    if (statuses.length === 0) {
      throw new HttpError('Must have at least one status', 400);
    }
  }

  if (settings.purchaseOrderWebhook.endpointUrl !== null) {
    try {
      new URL(settings.purchaseOrderWebhook.endpointUrl);
    } catch (e) {
      throw new HttpError('Invalid webhook endpoint URL', 400);
    }
  }

  for (const templates of [settings.purchaseOrderPrintTemplates, settings.workOrderPrintTemplates] as const) {
    for (const [name, template] of Object.entries(templates)) {
      if (!isValidLiquidTemplate(template.subject)) {
        throw new HttpError(`Invalid subject template for ${name}`, 400);
      }

      if (!isValidLiquidTemplate(template.template)) {
        throw new HttpError(`Invalid liquid template for ${name}`, 400);
      }
    }
  }
}

function isValidLiquidTemplate(template: string) {
  try {
    const liquid = new Liquid();
    liquid.parse(template);
    return true;
  } catch (e) {
    return false;
  }
}
