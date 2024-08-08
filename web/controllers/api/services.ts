import { Authenticated, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { Int, PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../../services/gql/gql.js';
import {
  FIXED_PRICE_SERVICE,
  getProductServiceType,
  ProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
  SERVICE_METAFIELD_VALUE_TAG_NAME,
} from '@work-orders/common/metafields/product-service-type.js';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { parseProductVariantMetafields, ProductVariantFragmentWithMetafields } from '../../services/product-variant.js';
import { match, P } from 'ts-pattern';
import { parseWithZod } from '@conform-to/zod';
import { SubmissionResult } from '@conform-to/react';
import { Session } from '@shopify/shopify-api';
import { ensureMetafieldDefinitionExists } from '../../services/metafields/installable-metafield-service.js';
import { productServiceTypeMetafield } from '../../services/metafields/product-service-type-metafield.js';
import { MetafieldInput } from '../../services/gql/queries/generated/schema.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { UpsertService } from '../../schemas/upsert-service.js';
import { FormBody } from '../../decorators/form-body.js';
import { identity } from '@teifi-digital/shopify-app-toolbox/functional';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import {
  baseProductVariantDefaultChargesMetafield,
  getProductVariantDefaultChargesMetafield,
} from '../../services/metafields/product-variant-default-charges.js';

@Authenticated()
export default class ServicesController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchServices(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchServicesResponse>,
  ) {
    const session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const query = [
      paginationOptions.query,
      'product_status:active',
      Object.values(SERVICE_METAFIELD_VALUE_TAG_NAME)
        .map(tag => `tag:"${escapeQuotationMarks(tag)}"`)
        .join(' OR '),
    ].join(' AND ');

    const services: ServiceProductVariant[] = [];

    const graphql = new Graphql(session);
    let hasNextPage = true;
    let endCursor: string | null = paginationOptions.after ?? null;
    const first = paginationOptions.first ?? (20 as Int);

    // We fetch multiple pages to support improper tagging
    // E.g. metafields being unset while tags are set
    while (hasNextPage && services.length < first) {
      const response = await gql.products.getPage.run(graphql, {
        query,
        first: (first - services.length) as Int,
        after: endCursor,
      });

      services.push(
        ...response.productVariants.nodes
          .filter(productVariant => getProductServiceType(productVariant.product.serviceType?.value) !== null)
          .map(productVariant => parseProductVariantMetafields(productVariant))
          .map(productVariant => ({
            ...productVariant,
            errors: getServiceProductVariantErrors(productVariant),
          })),
      );

      hasNextPage = response.productVariants.pageInfo.hasNextPage;
      endCursor = response.productVariants.pageInfo.endCursor;
    }

    return res.json({
      services,
      pageInfo: {
        hasNextPage,
        endCursor,
      },
    });
  }

  @Get('/:id')
  async getService(req: Request<{ id: string }>, res: Response<GetServiceResponse>) {
    const session: Session = res.locals.shopify.session;
    const { id } = req.params;

    const graphql = new Graphql(session);
    const { productVariant } = await gql.products.get.run(graphql, { id: createGid('ProductVariant', id) });

    if (!productVariant) {
      return res.json({ service: null });
    }

    const serviceType = getProductServiceType(productVariant.product.serviceType?.value);

    if (!serviceType) {
      return res.json({ service: null });
    }

    return res.json({
      service: {
        ...parseProductVariantMetafields(productVariant),
        errors: getServiceProductVariantErrors(productVariant),
      },
    });
  }

  @Post('/')
  @FormBody()
  async upsertService(req: Request, res: Response<UpsertServiceResponse>) {
    const submission = parseWithZod(req.body, { schema: UpsertService });

    if (submission.status !== 'success') {
      return res.status(200).json({
        type: 'submission-result',
        submissionResult: submission.reply(),
      });
    }

    const session: Session = res.locals.shopify.session;
    const graphql = new Graphql(session);

    const { productVariantId, sku, type, title, description } = submission.value;

    const serviceType = match(type)
      .returnType<ProductServiceType>()
      .with('fixed', () => FIXED_PRICE_SERVICE)
      .with('dynamic', () => QUANTITY_ADJUSTING_SERVICE)
      .exhaustive();
    const tags: string[] = [SERVICE_METAFIELD_VALUE_TAG_NAME[serviceType]];

    const price = match(submission.value)
      .with({ type: 'fixed', price: P.select() }, identity)
      .with({ type: 'dynamic' }, () => BigDecimal.ONE.toMoney())
      .exhaustive();

    const defaultChargeIds = match(submission.value)
      .with({ type: 'fixed' }, () => null)
      .with({ type: 'dynamic', defaultCharges: P.select() }, identity)
      .exhaustive();

    await Promise.all([
      getProductVariantDefaultChargesMetafield(graphql).then(metafield =>
        ensureMetafieldDefinitionExists(graphql, metafield),
      ),
      ensureMetafieldDefinitionExists(graphql, productServiceTypeMetafield),
    ]);

    let productVariant = null;

    if (productVariantId) {
      const result = await gql.products.get.run(graphql, {
        id: productVariantId,
      });

      if (!result.productVariant) {
        throw new HttpError('Service product variant not found', 404);
      }

      productVariant = result.productVariant;
    }

    const productMetafields: MetafieldInput[] = [];
    const productVariantMetafields: MetafieldInput[] = [];

    if (productVariant?.product.serviceType) {
      // Update existing metafield
      productMetafields.push({
        id: productVariant.product.serviceType.id,
        value: serviceType,
      });
    } else {
      // Create new metafield (this branch is only taken if the merchant deleted the metafield manually)
      productMetafields.push({
        namespace: productServiceTypeMetafield.namespace,
        key: productServiceTypeMetafield.key,
        type: productServiceTypeMetafield.type,
        value: serviceType,
      });
    }

    const value = JSON.stringify(defaultChargeIds ?? []);

    if (productVariant?.defaultCharges) {
      productVariantMetafields.push({
        id: productVariant.defaultCharges.id,
        value,
      });
    } else {
      productVariantMetafields.push({
        namespace: baseProductVariantDefaultChargesMetafield.namespace,
        key: baseProductVariantDefaultChargesMetafield.key,
        type: baseProductVariantDefaultChargesMetafield.type,
        value,
      });
    }

    if (productVariant) {
      const { productVariantUpdate } = await gql.products.updateVariant.run(graphql, {
        input: {
          id: productVariantId,
          sku,
          price,
          metafields: productVariantMetafields,
        },
      });

      if (!productVariantUpdate?.productVariant) {
        throw new HttpError('Failed to update service product variant', 500);
      }

      const { productUpdate } = await gql.products.updateProduct.run(graphql, {
        input: {
          id: productVariant.product.id,
          tags,
          metafields: productMetafields,
          title,
          descriptionHtml: description,
        },
      });

      if (!productUpdate?.product) {
        throw new HttpError('Failed to update product', 500);
      }

      return res.json({
        type: 'success',
        variant: {
          ...parseProductVariantMetafields(productVariantUpdate.productVariant),
          errors: getServiceProductVariantErrors(productVariantUpdate.productVariant),
        },
      });
    } else {
      const { productCreate } = await gql.products.create.run(graphql, {
        input: {
          tags,
          metafields: productMetafields,
          title,
          descriptionHtml: description,
          variants: [{ sku, price, metafields: productVariantMetafields }],
        },
      });

      if (!productCreate?.product) {
        throw new HttpError('Failed to create service product', 500);
      }

      const [variant] = productCreate.product.variants.nodes;

      if (!variant) {
        throw new HttpError('Failed to create service product variant', 500);
      }

      return res.json({
        type: 'success',
        variant: {
          ...parseProductVariantMetafields(variant),
          errors: getServiceProductVariantErrors(variant),
        },
      });
    }
  }
}

type ServiceProductVariant = ProductVariantFragmentWithMetafields & { errors: string[] | null };

function getServiceProductVariantErrors(productVariant: gql.products.ProductVariantFragment.Result) {
  return match(productVariant)
    .with({ price: P.not('1.00'), product: { serviceType: { value: QUANTITY_ADJUSTING_SERVICE } } }, () => [
      'Dynamic services must have a unit price of $1.00 - save to repair',
    ])
    .otherwise(() => null);
}

export type FetchServicesResponse = {
  services: ServiceProductVariant[];
  pageInfo: gql.products.getPage.Result['productVariants']['pageInfo'];
};

export type GetServiceResponse = {
  service: ServiceProductVariant | null;
};

export type UpsertServiceResponse =
  | {
      type: 'submission-result';
      submissionResult: SubmissionResult;
    }
  | {
      type: 'success';
      variant: ServiceProductVariant;
    };
