import type { PartialShopSettings } from '../../schemas/generated/partial-shop-settings.js';
import { getShopSettings, updateSettings } from '../../services/settings.js';
import { Session } from '@shopify/shopify-api';
import { Authenticated, BodySchema, Get, Post } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import type { Request, Response } from 'express-serve-static-core';

@Authenticated()
export default class SettingsController {
  @Get('/')
  async fetchSettings(req: Request, res: Response) {
    const session: Session = res.locals.shopify.session;
    const settings = await getShopSettings(session.shop);
    return res.json({ settings });
  }

  @Post('/')
  @BodySchema('partial-shop-settings')
  async updateSetting(req: Request<unknown, unknown, PartialShopSettings>, res: Response) {
    const { shop }: Session = res.locals.shopify.session;
    const settings = req.body;

    await updateSettings(shop, settings);

    return res.json({ success: true });
  }
}

export type FetchSettingsResponse = {
  settings: Awaited<ReturnType<typeof getShopSettings>>;
};
