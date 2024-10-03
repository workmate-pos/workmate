import { getShopSettings, updateShopSettings } from '../../services/settings/settings.js';
import { Authenticated, Get, Middleware, Post } from '@teifi-digital/shopify-app-express/decorators';
import type { Request, Response } from 'express-serve-static-core';
import { Permission } from '../../decorators/permission.js';
import express from 'express';
import { Session } from '@shopify/shopify-api';
import { ShopSettings } from '../../services/settings/schema.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

@Authenticated()
export default class SettingsController {
  @Get('/')
  @Permission('read_settings')
  async fetchSettings(req: Request, res: Response) {
    const session: Session = res.locals.shopify.session;
    const settings = await getShopSettings(session.shop);
    return res.json({ settings });
  }

  @Post('/')
  @Middleware(express.json())
  @Permission('write_settings')
  async updateSetting(req: Request<unknown, unknown, unknown>, res: Response) {
    const { shop }: Session = res.locals.shopify.session;
    const settings = req.body;

    const parsed = ShopSettings.safeParse(settings);

    if (!parsed.success) {
      const [error] = parsed.error.errors;

      if (!error) {
        throw new HttpError('Invalid settings', 400);
      }

      const message = `${error.path.join('.')} ${error.message}`;
      throw new HttpError(message, 400);
    }

    await updateShopSettings(shop, parsed.data);

    return res.json({ success: true });
  }
}

export type FetchSettingsResponse = {
  settings: Awaited<ReturnType<typeof getShopSettings>>;
};
