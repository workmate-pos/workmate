import { Authenticated } from '@teifi-digital/shopify-app-express/decorators';
import { BodySchema, Get, Post } from '@teifi-digital/shopify-app-express/decorators';
import type { Request, Response } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { db } from '../../services/db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { UpsertCustomFieldsPreset } from '../../schemas/generated/upsert-custom-fields-preset.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

@Authenticated()
export default class CustomFieldsPresetsController {
  @Get('/:type')
  async fetchCustomFieldsPresets(req: Request<{ type: string }>, res: Response<FetchCustomFieldsPresetsResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { type } = req.params;

    assertValidPresetType(type);

    const presets = await db.customFieldPresets.getCustomFieldsPresets({ shop, type });

    return res.json({
      presets: presets.map(preset => ({
        name: preset.name,
        keys: preset.keys ?? never(),
      })),
    });
  }

  @Post('/:type/:name')
  @BodySchema('upsert-custom-fields-preset')
  async upsertCustomFieldsPreset(
    req: Request<{ type: string; name: string }, unknown, UpsertCustomFieldsPreset>,
    res: Response<UpsertCustomFieldsPresetResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { type, name } = req.params;
    const { keys } = req.body;

    assertValidPresetType(type);

    if (keys.length === 0) {
      throw new HttpError('Custom fields cannot be empty', 400);
    }

    await db.customFieldPresets.upsertCustomFieldsPreset({ shop, name, keys, type });

    return res.json({ name });
  }
}

export type FetchCustomFieldsPresetsResponse = {
  presets: {
    name: string;
    keys: string[];
  }[];
};

export type UpsertCustomFieldsPresetResponse = {
  name: string;
};

const CUSTOM_FIELDS_PRESET_TYPE = {
  WORK_ORDER: 'WORK_ORDER',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
} as const;

function assertValidPresetType(type: string): asserts type is CustomFieldsPresetType {
  if (!Object.values(CUSTOM_FIELDS_PRESET_TYPE).some(t => t === type)) {
    throw new HttpError('Invalid preset type', 400);
  }
}

export type CustomFieldsPresetType = (typeof CUSTOM_FIELDS_PRESET_TYPE)[keyof typeof CUSTOM_FIELDS_PRESET_TYPE];
