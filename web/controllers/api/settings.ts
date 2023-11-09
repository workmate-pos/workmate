import { Controller } from '@teifi-digital/shopify-app-express/controllers';
import type { PartialShopSettings } from '../../schemas/generated/partial-shop-settings.js';
import { getSettingsByShop, upsertSetting } from '../../services/settings.js';
import { prisma } from '../../services/prisma.js';
import { Session } from '@shopify/shopify-api';

async function fetchSettings(req: any, res: any) {
  const session: Session = res.locals.shopify.session;
  const settings = await getSettingsByShop(session.shop);

  return res.json({ settings });
}

async function updateSetting(req: any, res: any) {
  const session: Session = res.locals.shopify.session;
  const settings: PartialShopSettings = req.body;

  const keys = Object.keys(settings) as (keyof PartialShopSettings)[];
  await prisma.$transaction(keys.map(key => upsertSetting(session.shop, key, settings[key]!)));

  return res.json({ success: true });
}

export default {
  endpoints: [
    ['/', 'GET', fetchSettings],
    ['/', 'POST', updateSetting, { bodySchemaName: 'partial-shop-settings' }],
  ],
} satisfies Controller;
