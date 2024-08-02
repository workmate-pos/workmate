import { Get, Authenticated, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Session } from '@shopify/shopify-api';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { Request, Response } from 'express-serve-static-core';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { fetchAllPages, gql } from '../../services/gql/gql.js';
import { ID } from '../../services/gql/queries/generated/schema.js';
import { Ids } from '../../schemas/generated/ids.js';

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
    const response = await gql.customer.getPage.run(graphql, paginationOptions);

    const customers = response.customers.nodes;
    const pageInfo = response.customers.pageInfo;

    return res.json({ customers, pageInfo });
  }

  @Get('/by-ids')
  @QuerySchema('ids')
  async fetchCustomersById(req: Request<unknown, unknown, unknown, Ids>, res: Response<FetchCustomersByIdResponse>) {
    const session: Session = res.locals.shopify.session;
    const { ids } = req.query;

    const graphql = new Graphql(session);
    const { nodes } = await gql.customer.getMany.run(graphql, { ids });

    const customers = nodes.filter(
      (node): node is null | (gql.customer.get.Result['customer'] & { __typename: 'Customer' }) =>
        node === null || node.__typename === 'Customer',
    );

    return res.json({ customers });
  }

  @Get('/metafields')
  async fetchCustomerMetafields(req: Request, res: Response<FetchCustomerMetafieldsResponse>) {
    const session: Session = res.locals.shopify.session;

    const graphql = new Graphql(session);

    const metafields = await fetchAllPages(
      graphql,
      gql.customer.getCustomerMetafieldDefinitions.run,
      result => result.metafieldDefinitions,
    );

    return res.json({
      metafields: metafields.map(({ namespace, key, name }) => ({
        namespace,
        key,
        name,
      })),
    });
  }

  @Get('/:id')
  async fetchCustomer(req: Request<{ id: ID }>, res: Response<FetchCustomerResponse>) {
    const session: Session = res.locals.shopify.session;
    const { id } = req.params;

    const graphql = new Graphql(session);
    const { customer } = await gql.customer.get.run(graphql, { id });

    return res.json({ customer });
  }
}

export type FetchCustomersResponse = {
  customers: gql.customer.CustomerFragment.Result[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

export type FetchCustomerResponse = {
  customer: gql.customer.CustomerFragment.Result | null;
};

export type FetchCustomersByIdResponse = {
  customers: (gql.customer.CustomerFragment.Result | null)[];
};

export type FetchCustomerMetafieldsResponse = {
  metafields: {
    namespace: string;
    key: string;
    name: string;
  }[];
};
