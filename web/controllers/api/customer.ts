import { Get, Authenticated, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default';
import { Session } from '@shopify/shopify-api';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { Request, Response } from 'express-serve-static-core';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../../services/gql/gql.js';
import { CustomerFragmentResult } from '../../services/gql/queries/generated/queries.js';

@Authenticated()
export default class CustomerController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchCustomers(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchCustomersResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const graphql = new Graphql(session);
    const response = await gql.customer.getCustomers(graphql, paginationOptions);

    const customers = response.customers.nodes;
    const pageInfo = response.customers.pageInfo;

    return res.json({ customers, pageInfo });
  }
}

export type FetchCustomersResponse = {
  customers: CustomerFragmentResult[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};