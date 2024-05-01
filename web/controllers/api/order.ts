import type { Request, Response } from 'express-serve-static-core';
import type { Session } from '@shopify/shopify-api';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { getOrder, getOrderInfos, getOrderLineItems } from '../../services/orders/get.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

@Authenticated()
export default class OrderController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchOrders(req: Request<unknown, unknown, unknown, PaginationOptions>, res: Response<FetchOrdersResponse>) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const orderInfos = await getOrderInfos(session, paginationOptions);

    return res.json(orderInfos);
  }

  @Get('/:id')
  async fetchOrder(req: Request<{ id: string }>, res: Response<FetchOrderResponse>) {
    const session: Session = res.locals.shopify.session;

    const gid = createGid('Order', req.params.id);
    const order = await getOrder(session, gid);

    return res.json(order);
  }

  @Get('/:id/line-items')
  @QuerySchema('pagination-options')
  async fetchOrderLineItems(
    req: Request<{ id: string }, unknown, unknown, PaginationOptions>,
    res: Response<FetchOrderLineItemsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const gid = createGid('Order', req.params.id);
    const lineItems = await getOrderLineItems(session, gid, paginationOptions);

    if (!lineItems) {
      throw new HttpError('Order not found', 404);
    }

    return res.json(lineItems);
  }
}

export type FetchOrdersResponse = Awaited<ReturnType<typeof getOrderInfos>>;

export type FetchOrderResponse = Awaited<ReturnType<typeof getOrder>>;

export type FetchOrderLineItemsResponse = NonNullable<Awaited<ReturnType<typeof getOrderLineItems>>>;
