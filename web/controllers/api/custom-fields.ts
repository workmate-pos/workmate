import { Authenticated, BodySchema, Delete, Get, Post } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import {
  deleteCustomFieldValueOptions,
  getCustomFieldValueOptions,
  upsertCustomFieldValueOptions,
} from '../../services/custom-fields/value-options/queries.js';
import { Session } from '@shopify/shopify-api';
import { UpsertCustomFieldValueOptions } from '../../schemas/generated/upsert-custom-field-value-options.js';
import { Permission } from '../../decorators/permission.js';

@Authenticated()
export default class CustomFieldsController {
  @Get('/field/:name/options')
  @Permission('read_settings')
  async fetchCustomFieldValueOptions(
    req: Request<{ name: string }>,
    res: Response<FetchCustomFieldValueOptionsResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { name } = req.params;

    const [options] = await getCustomFieldValueOptions({ shop, name });

    return res.json({ options: options?.values ?? [] });
  }

  @Get('/fields')
  @Permission('read_settings')
  async fetchCustomFieldNames(req: Request, res: Response<FetchCustomFieldNamesResponse>) {
    const { shop }: Session = res.locals.shopify.session;

    const options = await getCustomFieldValueOptions({ shop });

    return res.json({
      fields: options.map(option => ({
        name: option.name,
        options: option.values,
      })),
    });
  }

  @Post('/field/:name')
  @BodySchema('upsert-custom-field-value-options')
  @Permission('write_settings')
  async upsertCustomFieldValueOptions(
    req: Request<{ name: string }, unknown, UpsertCustomFieldValueOptions>,
    res: Response<FetchCustomFieldValueOptionsResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { name } = req.params;

    const options = await upsertCustomFieldValueOptions({
      shop,
      name,
      values: req.body.options,
    });

    return res.json({ options });
  }

  @Delete('/field/:name')
  @Permission('write_settings')
  async deleteCustomFieldValueOptions(
    req: Request<{ name: string }>,
    res: Response<DeleteCustomFieldValueOptionsResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const { name } = req.params;

    await deleteCustomFieldValueOptions({ shop, name });

    return res.json({ success: true });
  }
}

export type FetchCustomFieldValueOptionsResponse = {
  options: string[];
};

export type FetchCustomFieldNamesResponse = {
  fields: {
    name: string;
    options: string[];
  }[];
};

export type DeleteCustomFieldValueOptionsResponse = {
  success: true;
};
