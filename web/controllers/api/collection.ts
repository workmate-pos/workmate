import type { Session } from '@shopify/shopify-api';
import type { Request, Response } from 'express-serve-static-core';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../../services/gql/gql.js';

@Authenticated()
export default class CollectionController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchCollections(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchCollectionsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const graphql = new Graphql(session);
    const response = await gql.collection.getPage.run(graphql, paginationOptions);

    const collections = response.collections.nodes;
    const pageInfo = response.collections.pageInfo;

    return res.json({ collections, pageInfo });
  }
}

export type FetchCollectionsResponse = {
  collections: gql.collection.getPage.Result['collections']['nodes'];
  pageInfo: gql.collection.getPage.Result['collections']['pageInfo'];
};
