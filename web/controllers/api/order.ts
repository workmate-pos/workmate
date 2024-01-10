import type { Request, Response } from 'express-serve-static-core';
import type { Session } from '@shopify/shopify-api';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { getOrder, getOrderInfos, getOrderLineItems } from '../../services/orders/get.js';
import { ID } from '../../schemas/generated/ids.js';

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
  async fetchOrder(req: Request<{ id: ID }>, res: Response<FetchOrderResponse>) {
    const session: Session = res.locals.shopify.session;
    const order = await getOrder(session, req.params.id);

    return res.json(order);
  }

  @Get('/:id/line-items')
  @QuerySchema('pagination-options')
  async fetchOrderLineItems(
    req: Request<{ id: ID }, unknown, unknown, PaginationOptions>,
    res: Response<FetchOrderLineItemsResponse | { error: string }>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const lineItems = await getOrderLineItems(session, req.params.id, paginationOptions);

    if (!lineItems) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(lineItems);
  }
}

export type FetchOrdersResponse = Awaited<ReturnType<typeof getOrderInfos>>;

export type FetchOrderResponse = Awaited<ReturnType<typeof getOrder>>;

export type FetchOrderLineItemsResponse = NonNullable<Awaited<ReturnType<typeof getOrderLineItems>>>;
