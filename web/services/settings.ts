import { getDefaultShopSetting, getShopSettingKeys } from './settings/default-settings.js';
import { ShopSettings } from '../schemas/generated/shop-settings.js';
import { db } from './db/db.js';
import { PartialShopSettings } from '../schemas/generated/partial-shop-settings.js';
import { unit } from './db/unit-of-work.js';

function serialize(value: ShopSettings[keyof ShopSettings]) {
  return JSON.stringify(value);
}

function deserialize(value: string): ShopSettings[keyof ShopSettings] {
  return JSON.parse(value);
}

export async function getSettingsByShop(shop: string) {
  await insertDefaultSettingsIfNotExists(shop);
  const rows = await db.settings.get({ shop });
  return Object.fromEntries(rows.map(({ key, value }) => [key, deserialize(value)])) as unknown as ShopSettings;
}

export function upsertSetting<const K extends keyof ShopSettings>(shop: string, key: K, value: ShopSettings[K]) {
  return db.settings.upsertSetting({ shop, key, value: serialize(value) });
}

export async function updateSettings(shop: string, partialShopSettings: PartialShopSettings) {
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
