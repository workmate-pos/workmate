import { Authenticated } from '@teifi-digital/shopify-app-express/decorators';
import { BodySchema, Get, Post } from '@teifi-digital/shopify-app-express/decorators';
import type { Request, Response } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { db } from '../../services/db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { UpsertCustomFieldsPreset } from '../../schemas/generated/upsert-custom-fields-preset.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

@Authenticated()
export default class PurchaseOrderCustomFieldsController {
  @Get('/')
  async fetchPurchaseOrderCustomFieldsPresets(
    req: Request,
    res: Response<FetchPurchaseOrderCustomFieldsPresetsResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;

    const presets = await db.customFieldPresets.getCustomFieldsPresets({ shop, type: 'PURCHASE_ORDER' });

    return res.json({
      presets: presets.map(preset => ({
        name: preset.name,
        keys: preset.keys ?? never(),
      })),
    });
  }

  @Post('/:name')
  @BodySchema('upsert-custom-fields-preset')
  async upsertPurchaseOrderCustomFieldsPreset(
    req: Request<{ name: string }, unknown, UpsertCustomFieldsPreset>,
    res: Response<UpsertCustomFieldsPresetResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { name } = req.params;
    const { keys } = req.body;

    if (keys.length === 0) {
      throw new HttpError('Custom fields cannot be empty', 400);
    }

    await db.customFieldPresets.upsertCustomFieldsPreset({ shop, name, keys, type: 'PURCHASE_ORDER' });

    return res.json({ name });
  }
}

export type FetchPurchaseOrderCustomFieldsPresetsResponse = {
  presets: {
    name: string;
    keys: string[];
  }[];
};

export type UpsertCustomFieldsPresetResponse = {
  name: string;
};
