import { Controller } from '@teifi-digital/shopify-app-express/controllers';
import type { PartialShopSettings } from '../../schemas/generated/partial-shop-settings.js';
import { getSettingsByShop, updateSettings } from '../../services/settings.js';
import { Session } from '@shopify/shopify-api';

async function fetchSettings(req: any, res: any) {
  const session: Session = res.locals.shopify.session;

  const settings = await getSettingsByShop(session.shop);

  return res.json({ settings });
}

async function updateSetting(req: any, res: any) {
  const { shop }: Session = res.locals.shopify.session;
  const settings: PartialShopSettings = req.body;

  await updateSettings(shop, settings);

  return res.json({ success: true });
}

export default {
  endpoints: [
    ['/', 'GET', fetchSettings],
    ['/', 'POST', updateSetting, { jsonSchemaName: 'partial-shop-settings' }],
  ],
} satisfies Controller;
