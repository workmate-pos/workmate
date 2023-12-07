import type { Request, Response } from 'express-serve-static-core';
import type { Session } from '@shopify/shopify-api';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default';
import { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../../services/gql/gql.js';
import { OrderFragmentResult } from '../../services/gql/queries/generated/queries.js';
import { PAYMENT_ADDITIONAL_DETAIL_KEYS } from '../../services/webhooks.js';

@Authenticated()
export default class OrderController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchOrders(req: Request<unknown, unknown, unknown, PaginationOptions>, res: Response<FetchOrdersResponse>) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const graphql = new Graphql(session);
    const response = await gql.order.getOrders(graphql, paginationOptions);

    const orders = response.orders.nodes.map(order => ({
      ...order,
      workOrderName:
        order.customAttributes.find(({ key }) => key == PAYMENT_ADDITIONAL_DETAIL_KEYS.WORK_ORDER_NAME)?.value ??
        undefined,
    }));
    const pageInfo = response.orders.pageInfo;

    return res.json({ orders, pageInfo });
  }
}

export type FetchOrdersResponse = {
  orders: (OrderFragmentResult & { workOrderName?: string })[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};
