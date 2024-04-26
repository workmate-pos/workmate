import type { Session } from '@shopify/shopify-api';
import type { Request, Response } from 'express-serve-static-core';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { gql } from '../../services/gql/gql.js';
import type { Ids } from '../../schemas/generated/ids.js';
import {
  addProductVariantComponents,
  parseProductVariantMetafields,
  ProductVariantFragmentWithComponents,
  ProductVariantFragmentWithMetafields,
} from '../../services/product-variant.js';
import { Int } from '../../services/gql/queries/generated/schema.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

@Authenticated()
export default class ProductVariantController {
  @Get('/barcode/:barcode')
  async fetchProductVariantByBarcode(req: Request<{ barcode: string }>, res: Response<FetchProductVariantResponse>) {
    const session: Session = res.locals.shopify.session;
    const { barcode } = req.params;

    const graphql = new Graphql(session);
    const {
      productVariants: { nodes },
    } = await gql.products.getPage.run(graphql, { first: 10 as Int, query: `barcode:"${barcode}"` });

    const productVariant = nodes.find(node => node.barcode === barcode);

    if (!productVariant) {
      throw new HttpError('Product variant not found', 404);
    }

    return res.json({
      productVariant: await addProductVariantComponents(graphql, parseProductVariantMetafields(productVariant)),
    });
  }

  @Get('/')
  @QuerySchema('pagination-options')
  async fetchProductVariants(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchProductsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const graphql = new Graphql(session);
    const response = await gql.products.getPage.run(graphql, paginationOptions);

    const { nodes: productVariants, pageInfo } = response.productVariants;

    return res.json({
      productVariants: await Promise.all(
        productVariants
          .map(parseProductVariantMetafields)
          .map(productVariant => addProductVariantComponents(graphql, productVariant)),
      ),
      pageInfo,
    });
  }

  @Get('/by-ids')
  @QuerySchema('ids')
  async fetchProductVariantsById(
    req: Request<unknown, unknown, unknown, Ids>,
    res: Response<FetchProductsByIdResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { ids } = req.query;

    const graphql = new Graphql(session);
    const { nodes } = await gql.products.getMany.run(graphql, { ids });

    const productVariants = nodes.filter(
      (node): node is null | (gql.products.ProductVariantFragment.Result & { __typename: 'ProductVariant' }) =>
        node === null || node.__typename === 'ProductVariant',
    );

    return res.json({
      productVariants: await Promise.all(
        productVariants
          .map(pv => (pv ? parseProductVariantMetafields(pv) : pv))
          .map(pv => (pv ? addProductVariantComponents(graphql, pv) : pv)),
      ),
    });
  }
}

export type FetchProductVariantResponse = {
  productVariant: (ProductVariantFragmentWithMetafields & ProductVariantFragmentWithComponents) | null;
};

export type FetchProductsResponse = {
  productVariants: (ProductVariantFragmentWithMetafields & ProductVariantFragmentWithComponents)[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

export type FetchProductsByIdResponse = {
  productVariants: ((ProductVariantFragmentWithMetafields & ProductVariantFragmentWithComponents) | null)[];
};
