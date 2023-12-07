import type { Session } from '@shopify/shopify-api';
import type { Request, Response } from 'express-serve-static-core';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { GetProductVariantsOperationResult } from '../../services/gql/queries/generated/queries.js';
import { gql } from '../../services/gql/gql.js';

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

    const graphql = new Graphql(session);
    const response = await gql.products.getProductVariants(graphql, paginationOptions);

    const { nodes: productVariants, pageInfo } = response.productVariants;

    return res.json({ productVariants, pageInfo });
  }
}

export type FetchProductsResponse = {
  productVariants: GetProductVariantsOperationResult['productVariants']['nodes'];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};
