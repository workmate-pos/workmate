import { prisma } from './prisma.js';
import { getDefaultShopSetting, getShopSettingKeys } from './settings/default-settings.js';
import { ShopSettings } from '../schemas/generated/shop-settings.js';

export async function getSettingsByShop(shop: string) {
  const rows = await prisma.settings.findMany({
    where: { shop },
  });

  const shopSettings: Partial<ShopSettings> = {};

  for (const { key, value } of rows) {
    shopSettings[key as keyof ShopSettings] = JSON.parse(value);
  }

  const missingSettingKeys = getShopSettingKeys().filter(key => !(key in shopSettings));
  const newRows = await prisma.$transaction(
    missingSettingKeys.map(key => upsertSetting(shop, key, getDefaultShopSetting(key))),
  );

  for (const { key, value } of newRows) {
    shopSettings[key as keyof ShopSettings] = JSON.parse(value);
  }

  return shopSettings as ShopSettings;
}

export function upsertSetting<const K extends keyof ShopSettings>(shop: string, key: K, value: ShopSettings[K]) {
  return prisma.settings.upsert({
    where: { shop_key: { shop, key } },
    update: { value: JSON.stringify(value) },
    create: { shop, key, value: JSON.stringify(value) },
  });
}
