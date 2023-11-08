import { db } from '../../db.js';
import { Controller } from '@teifi-digital/shopify-app-express/controllers';
import type { PartialShopSettings } from '../../schemas/generated/partial-shop-settings.js';

async function fetchSettings(req, res) {
  const session = res.locals.shopify.session;
  const settings = await db.findSettingsByShop(session.shop);

  return res.json({ settings });
}

async function updateSetting(req, res) {
  const session = res.locals.shopify.session;
  const settings: PartialShopSettings = req.body;

  const keys = Object.keys(settings) as (keyof PartialShopSettings)[];
  for (const key of keys) {
    const value = settings[key];
    await db.updateSetting(session.shop, key, value);
  }

  return res.json({ success: true });
}

export default {
  endpoints: [
    ['/', 'GET', fetchSettings],
    ['/', 'POST', updateSetting, { jsonSchemaName: 'partial-shop-settings' }],
  ],
} satisfies Controller;
