import { Authenticated, BodySchema, Delete, Get, Post } from '@teifi-digital/shopify-app-express/decorators';
import type { Request, Response } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { db } from '../../services/db/db.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { UpsertCustomFieldsPreset } from '../../schemas/generated/upsert-custom-fields-preset.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { unit } from '../../services/db/unit-of-work.js';

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
        default: preset.default,
        type: preset.type,
      })),
    });
  }

  @Post('/:type/:currentName')
  @BodySchema('upsert-custom-fields-preset')
  async upsertCustomFieldsPreset(
    req: Request<{ type: string; currentName: string }, unknown, UpsertCustomFieldsPreset>,
    res: Response<UpsertCustomFieldsPresetResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { type, currentName } = req.params;
    const { name, keys, default: isDefault } = req.body;

    assertValidPresetType(type);

    await unit(async () => {
      await db.customFieldPresets.removeCustomFieldsPreset({ shop, name: currentName, type });
      await db.customFieldPresets.upsertCustomFieldsPreset({ shop, name, keys, type, default: isDefault });
    });

    return res.json({ name, type });
  }

  @Delete('/:type/:name')
  async deleteCustomFieldsPreset(
    req: Request<{ type: string; name: string }>,
    res: Response<DeleteCustomFieldsPresetResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { type, name } = req.params;

    assertValidPresetType(type);

    await unit(async () => {
      const [preset] = await db.customFieldPresets.getCustomFieldsPreset({ shop, type, name });

      if (!preset) {
        throw new HttpError('Preset not found', 404);
      }

      await db.customFieldPresets.removeCustomFieldsPreset({ shop, name, type });
    });

    return res.json({ name, type });
  }
}

export type FetchCustomFieldsPresetsResponse = {
  presets: {
    name: string;
    type: CustomFieldsPresetType;
    keys: string[];
    default: boolean;
  }[];
};

export type UpsertCustomFieldsPresetResponse = {
  name: string;
  type: CustomFieldsPresetType;
};

export type DeleteCustomFieldsPresetResponse = {
  name: string;
  type: CustomFieldsPresetType;
};

const CUSTOM_FIELDS_PRESET_TYPE = {
  WORK_ORDER: 'WORK_ORDER',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  LINE_ITEM: 'LINE_ITEM',
} as const;

function assertValidPresetType(type: string): asserts type is CustomFieldsPresetType {
  if (!Object.values(CUSTOM_FIELDS_PRESET_TYPE).some(t => t === type)) {
    throw new HttpError('Invalid preset type', 400);
  }
}

export type CustomFieldsPresetType = (typeof CUSTOM_FIELDS_PRESET_TYPE)[keyof typeof CUSTOM_FIELDS_PRESET_TYPE];
