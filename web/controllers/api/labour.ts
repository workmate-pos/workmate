import { Authenticated, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { Request, Response } from 'express-serve-static-core';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { match, P } from 'ts-pattern';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../../services/gql/gql.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import {
  MetaobjectFields,
  MetaobjectType,
  ParsedMetaobject,
  parseMetaobject,
  replaceAppPrefix,
} from '../../services/metaobjects/index.js';
import { hourlyLabourChargeMetaobject } from '../../services/metaobjects/hourly-labour-charge.js';
import { fixedPriceLabourChargeMetaobject } from '../../services/metaobjects/fixed-price-labour-charge.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { FormBody } from '../../decorators/form-body.js';
import { UpsertLabour } from '../../schemas/upsert-labour.js';
import { parseWithZod } from '@conform-to/zod';
import { Session } from '@shopify/shopify-api';
import { ensureMetaobjectDefinitionExists } from '../../services/metaobjects/installable-metaobject-service.js';
import { SubmissionResult } from '@conform-to/react';
import { MetaobjectFieldInput } from '../../services/gql/queries/generated/schema.js';

@Authenticated()
export default class LabourController {
  @Get('/page/:type')
  @QuerySchema('pagination-options')
  async fetchLabour(
    req: Request<{ type: string }, unknown, unknown, PaginationOptions>,
    res: Response<FetchLabourResponse>,
  ) {
    const session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const type = match(req.params.type)
      .with('hourly', () => hourlyLabourChargeMetaobject.definition.type)
      .with('fixed', () => fixedPriceLabourChargeMetaobject.definition.type)
      .otherwise(() => {
        throw new HttpError('Invalid labour type', 404);
      });

    const graphql = new Graphql(session);
    const response = await gql.metaobjects.getPage.run(graphql, {
      type,
      first: paginationOptions.first,
      after: paginationOptions.after,
    });

    return res.json({
      labour: response.metaobjects.nodes.map(metaobject => parseLabourMetaobject(metaobject)).filter(isNonNullable),
      pageInfo: response.metaobjects.pageInfo,
    });
  }

  @Get('/:id')
  async getLabour(req: Request<{ id: string }>, res: Response<GetLabourResponse>) {
    const session = res.locals.shopify.session;
    const { id } = req.params;

    const graphql = new Graphql(session);
    const { metaobject } = await gql.metaobjects.get.run(graphql, {
      id: createGid('Metaobject', id),
    });

    if (!metaobject) {
      return res.json({ labour: null });
    }

    return res.json({ labour: parseLabourMetaobject(metaobject) });
  }

  // TODO: Clean up !
  @Post('/')
  @FormBody()
  async upsertLabour(req: Request, res: Response<UpsertLabourResponse>) {
    const submission = parseWithZod(req.body, { schema: UpsertLabour });

    if (submission.status !== 'success') {
      return res.status(200).json({
        submissionResult: submission.reply(),
        labour: null,
      });
    }

    const session: Session = res.locals.shopify.session;
    const graphql = new Graphql(session);

    const [
      {
        shop: { currencyCode },
      },
    ] = await Promise.all([
      gql.store.getProperties.run(graphql, {}),
      ensureMetaobjectDefinitionExists(graphql, fixedPriceLabourChargeMetaobject.definition),
      ensureMetaobjectDefinitionExists(graphql, hourlyLabourChargeMetaobject.definition),
    ]);

    const fields: MetaobjectFieldInput[] = [];

    if (submission.value.type === 'fixed') {
      const values: MetaobjectFields<'$app:fixed-price-labour-charge'> = {
        name: submission.value.name,
        amount: JSON.stringify({ amount: submission.value.amount, currency_code: currencyCode }),
        'customize-amount': JSON.stringify(submission.value.customizeAmount),
        removable: JSON.stringify(submission.value.removable),
      };

      for (const [key, value] of Object.entries(values)) {
        fields.push({ key, value: String(value) });
      }
    } else if (submission.value.type === 'hourly') {
      const values: MetaobjectFields<'$app:hourly-labour-charge'> = {
        name: submission.value.name,
        rate: JSON.stringify({ amount: submission.value.rate, currency_code: currencyCode }),
        'customize-rate': JSON.stringify(submission.value.customizeRate),
        hours: submission.value.hours,
        'customize-hours': JSON.stringify(submission.value.customizeHours),
        removable: JSON.stringify(submission.value.removable),
      };

      for (const [key, value] of Object.entries(values)) {
        fields.push({ key, value: String(value) });
      }
    } else {
      return submission.value satisfies never;
    }

    const { metaobjectId, type } = submission.value;

    if (metaobjectId) {
      const { metaobject } = await gql.metaobjects.get.run(graphql, { id: metaobjectId });

      if (!metaobject) {
        throw new HttpError('Labour metaobject not found', 404);
      }

      let labour = parseLabourMetaobject(metaobject);

      if (!labour) {
        throw new HttpError('Labour metaobject not found', 404);
      }

      const labourType = match(type)
        .returnType<ParsedMetaobject<'$app:hourly-labour-charge' | '$app:fixed-price-labour-charge'>['type']>()
        .with('hourly', () => 'hourly-labour-charge')
        .with('fixed', () => 'fixed-price-labour-charge')
        .exhaustive();

      if (labour.type !== labourType) {
        throw new HttpError('Labour metaobject type does not match input labour type', 400);
      }

      const { metaobjectUpdate } = await gql.metaobjects.update.run(graphql, {
        id: metaobjectId,
        input: { fields },
      });

      if (!metaobjectUpdate?.metaobject) {
        throw new HttpError('Failed to update labour metaobject', 500);
      }

      labour = parseLabourMetaobject(metaobjectUpdate.metaobject);

      if (!labour) {
        throw new HttpError('Failed to update labour metaobject', 500);
      }

      return res.json({
        submissionResult: submission.reply(),
        labour,
      });
    } else {
      const { metaobjectCreate } = await gql.metaobjects.create.run(graphql, {
        input: {
          type: match(type)
            .returnType<MetaobjectType>()
            .with('hourly', () => '$app:hourly-labour-charge')
            .with('fixed', () => '$app:fixed-price-labour-charge')
            .exhaustive(),
          fields,
        },
      });

      if (!metaobjectCreate?.metaobject) {
        throw new HttpError('Failed to create labour metaobject', 500);
      }

      const labour = parseLabourMetaobject(metaobjectCreate.metaobject);

      if (!labour) {
        throw new HttpError('Failed to create labour metaobject', 500);
      }

      return res.json({
        submissionResult: submission.reply(),
        labour,
      });
    }
  }
}

function parseLabourMetaobject(metaobject: gql.metaobjects.MetaobjectFragment.Result) {
  return match({ ...metaobject, type: replaceAppPrefix(metaobject.type) })
    .with(
      {
        type: P.union(hourlyLabourChargeMetaobject.definition.type, fixedPriceLabourChargeMetaobject.definition.type),
      },
      parseMetaobject,
    )
    .otherwise(() => null);
}

export type FetchLabourResponse = {
  labour: ParsedMetaobject<'$app:hourly-labour-charge' | '$app:fixed-price-labour-charge'>[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

export type GetLabourResponse = {
  labour: ParsedMetaobject<'$app:hourly-labour-charge' | '$app:fixed-price-labour-charge'> | null;
};

export type UpsertLabourResponse = {
  submissionResult: SubmissionResult;
  labour: ParsedMetaobject<'$app:hourly-labour-charge' | '$app:fixed-price-labour-charge'> | null;
};
