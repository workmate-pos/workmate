import type { Session } from '@shopify/shopify-api';
import type { Request, Response } from 'express-serve-static-core';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { gql } from '../../services/gql/gql.js';
import type { Ids } from '../../schemas/generated/ids.js';
import { getShopSettings } from '../../services/settings.js';

@Authenticated()
export default class ProductVariantController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchProductVariants(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchProductsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const { serviceCollectionId } = await getShopSettings(session.shop);

    const graphql = new Graphql(session);
    const response = await gql.products.getPage.run(graphql, { ...paginationOptions, serviceCollectionId });

    const { nodes: productVariants, pageInfo } = response.productVariants;

    return res.json({ productVariants, pageInfo });
  }

  @Get('/by-ids')
  @QuerySchema('ids')
  async fetchProductVariantsById(
    req: Request<unknown, unknown, unknown, Ids>,
    res: Response<FetchProductsByIdResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { ids } = req.query;

    const { serviceCollectionId } = await getShopSettings(session.shop);

    const graphql = new Graphql(session);
    const { nodes } = await gql.products.getMany.run(graphql, { ids, serviceCollectionId });

    const productVariants = nodes.filter(
      (node): node is null | (gql.products.ProductVariantFragment.Result & { __typename: 'ProductVariant' }) =>
        node === null || node.__typename === 'ProductVariant',
    );

    return res.json({ productVariants });
  }
}

export type FetchProductsResponse = {
  productVariants: gql.products.ProductVariantFragment.Result[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

export type FetchProductsByIdResponse = {
  productVariants: (gql.products.ProductVariantFragment.Result | null)[];
};
