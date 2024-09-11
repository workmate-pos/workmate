import { Get, Authenticated, QuerySchema, Post, BodySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Session } from '@shopify/shopify-api';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { Request, Response } from 'express-serve-static-core';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { fetchAllPages, gql } from '../../services/gql/gql.js';
import { ID } from '../../services/gql/queries/generated/schema.js';
import { Ids } from '../../schemas/generated/ids.js';
import { Permission } from '../../decorators/permission.js';
import { UpdateCustomerNotificationPreference } from '../../schemas/generated/update-customer-notification-preference.js';
import { getNotificationPreference } from '../../services/customer-notification-preference/notification-preference.js';
import { httpError } from '../../util/http-error.js';
import {
  deleteCustomerNotificationPreference,
  getCustomerNotificationPreference,
  upsertCustomerNotificationPreference,
} from '../../services/customer-notification-preference/queries.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';

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

  @Get('/:id/notification-preference')
  async fetchCustomerNotificationPreference(
    req: Request<{ id: ID }>,
    res: Response<FetchCustomerNotificationPreferenceResponse>,
  ) {
    const { id } = req.params;

    const customerId = createGid('Customer', id);
    const customerNotificationPreference = await getCustomerNotificationPreference(customerId);

    if (!customerNotificationPreference) {
      return res.json({ preference: null });
    }

    return res.json({
      preference: getNotificationPreference(customerNotificationPreference, null),
    });
  }

  @Post('/:id/notification-preference')
  @BodySchema('update-customer-notification-preference')
  async updateCustomerNotificationPreference(
    req: Request<{ id: ID }, unknown, UpdateCustomerNotificationPreference>,
    res: Response<UpdateCustomerNotificationPreferenceResponse>,
  ) {
    const preference = req.body.preference
      ? (getNotificationPreference(req.body.preference, null) ??
        httpError(`Invalid preference '${req.body.preference}'`))
      : null;

    const customerId = createGid('Customer', req.params.id);

    if (preference) {
      await upsertCustomerNotificationPreference(customerId, preference);
    } else {
      await deleteCustomerNotificationPreference(customerId);
    }

    return res.json({ success: true });
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

export type FetchCustomerNotificationPreferenceResponse = {
  preference: string | null;
};

export type UpdateCustomerNotificationPreferenceResponse = {
  success: true;
};
