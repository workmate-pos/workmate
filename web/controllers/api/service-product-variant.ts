import type { Session } from '@shopify/shopify-api';
import type { Request, Response } from 'express-serve-static-core';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { GetCollectionProductVariantsOperationResult } from '../../services/gql/queries/generated/queries.js';
import { gql } from '../../services/gql/gql.js';
import { getSettingsByShop } from '../../services/settings.js';
import { ID } from '../../services/gql/queries/generated/schema.js';
import { PaginationOptions } from '../../schemas/generated/pagination-options.js';

@Authenticated()
export default class ServiceProductVariant {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchServiceProductVariants(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchServiceProductVariantsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;
    const settings = await getSettingsByShop(session.shop);

    if (!settings.serviceCollectionId) {
      return res.json({ productVariants: [], pageInfo: { hasNextPage: false, endCursor: null } });
    }

    const graphql = new Graphql(session);
    const response = await gql.collection.getCollectionProductVariants(graphql, {
      ...paginationOptions,
      id: settings.serviceCollectionId as ID,
    });

    if (!response.collection) {
      return res.json({ productVariants: [], pageInfo: { hasNextPage: false, endCursor: null } });
    }

    const { nodes, pageInfo } = response.collection.products;
    const productVariants = nodes.flatMap(node => node.variants.nodes);

    return res.json({ productVariants, pageInfo });
  }
}

export type FetchServiceProductVariantsResponse = {
  productVariants: NonNullable<
    GetCollectionProductVariantsOperationResult['collection']
  >['products']['nodes'][number]['variants']['nodes'];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};
