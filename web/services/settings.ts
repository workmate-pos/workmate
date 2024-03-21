import { getDefaultShopSetting, getShopSettingKeys } from './settings/default-settings.js';
import { ShopSettings } from '../schemas/generated/shop-settings.js';
import { PartialShopSettings } from '../schemas/generated/partial-shop-settings.js';
import { db } from './db/db.js';
import { unit } from './db/unit-of-work.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { assertValidFormatString } from './id-formatting.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';

function serialize(value: ShopSettings[keyof ShopSettings]) {
  return JSON.stringify(value);
}

function deserialize(value: string): ShopSettings[keyof ShopSettings] {
  return JSON.parse(value);
}

export async function getShopSettings(shop: string) {
  await insertDefaultSettingsIfNotExists(shop);
  const rows = await db.settings.get({ shop });
  return Object.fromEntries(rows.map(({ key, value }) => [key, deserialize(value)])) as unknown as ShopSettings;
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
  await unit(async () => {
    const entries = getShopSettingKeys().map(key => [key, getDefaultShopSetting(key)]) as [
      keyof ShopSettings,
      ShopSettings[keyof ShopSettings],
    ][];

    return await Promise.all(
      entries.map(([key, value]) =>
        db.settings.insertSettingIfNotExists({
          shop,
          key,
          value: serialize(value),
        }),
      ),
    );
  });
}

function assertValidSettings(settings: ShopSettings) {
  assertValidFormatString(settings.idFormat);

  if (settings.purchaseOrderWebhook.endpointUrl !== null) {
    try {
      new URL(settings.purchaseOrderWebhook.endpointUrl);
    } catch (e) {
      throw new HttpError('Invalid webhook endpoint URL', 400);
    }
  }

  if (!settings.statuses.includes(settings.defaultStatus)) {
    throw new HttpError('Invalid default status', 400);
  }

  if (unique(settings.statuses).length !== settings.statuses.length) {
    throw new HttpError('Duplicate statuses are not allowed', 400);
  }

  if (settings.statuses.length === 0) {
    throw new HttpError('Must have at least one status', 400);
  }
}
