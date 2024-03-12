import { Authenticated } from '@teifi-digital/shopify-app-express/decorators/default/authenticated.js';
import { BodySchema, Get, Post } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import type { Request, Response } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { db } from '../../services/db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { UpsertCustomFieldsPreset } from '../../schemas/generated/upsert-custom-fields-preset.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';

@Authenticated()
export default class WorkOrderCustomFieldsController {
  @Get('/')
  async fetchWorkOrderCustomFieldsPresets(req: Request, res: Response<FetchWorkOrderCustomFieldsPresetsResponse>) {
    const { shop }: Session = res.locals.shopify.session;

    const presets = await db.customFieldPresets.getCustomFieldsPresets({ shop, type: 'WORK_ORDER' });

    return res.json({
      presets: presets.map(preset => ({
        name: preset.name,
        keys: preset.keys ?? never(),
      })),
    });
  }

  @Post('/:name')
  @BodySchema('upsert-custom-fields-preset')
  async upsertWorkOrderCustomFieldsPreset(
    req: Request<{ name: string }, unknown, UpsertCustomFieldsPreset>,
    res: Response<UpsertCustomFieldsPresetResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { name } = req.params;
    const { keys } = req.body;

    if (keys.length === 0) {
      throw new HttpError('Custom fields cannot be empty', 400);
    }

    console.log(shop, name, keys);
    await db.customFieldPresets.upsertCustomFieldsPreset({ shop, name, keys, type: 'WORK_ORDER' });

    return res.json({ name });
  }
}

export type FetchWorkOrderCustomFieldsPresetsResponse = {
  presets: {
    name: string;
    keys: string[];
  }[];
};

export type UpsertCustomFieldsPresetResponse = {
  name: string;
};
