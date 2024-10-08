import type { Request, Response } from 'express-serve-static-core';
import type { Session } from '@shopify/shopify-api';
import { Authenticated, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { getOrder, getOrderPage, getOrderLineItems } from '../../services/orders/get.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { WORK_ORDER_CUSTOM_ATTRIBUTE_NAME } from '@work-orders/work-order-shopify-order';
import { getWorkOrder } from '../../services/work-orders/queries.js';
import { cleanOrphanedDraftOrders } from '../../services/work-orders/clean-orphaned-draft-orders.js';
import { syncShopifyOrders } from '../../services/shopify-order/sync.js';

@Authenticated()
export default class OrderController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchOrders(req: Request<unknown, unknown, unknown, PaginationOptions>, res: Response<FetchOrdersResponse>) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const orderInfos = await getOrderPage(session, paginationOptions);

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

  @Post('/:id/sync')
  async syncOrder(req: Request<{ id: string }>, res: Response<SyncOrderResponse>) {
    const session: Session = res.locals.shopify.session;
    const { id } = req.params;

    const orderId = createGid('Order', id);
    const order = await getOrder(session, orderId);

    if (!order) {
      throw new HttpError('Order not found', 404);
    }

    const workOrderName = order.customAttributes.find(({ key }) => key === WORK_ORDER_CUSTOM_ATTRIBUTE_NAME)?.value;

    if (!workOrderName) {
      throw new HttpError('Order is not associated with a work order', 400);
    }

    const workOrder = await getWorkOrder({ shop: session.shop, name: workOrderName, locationIds: null });

    if (!workOrder) {
      throw new HttpError('Order is associated with an unknown work order', 400);
    }

    await cleanOrphanedDraftOrders(session, workOrder.id, () => syncShopifyOrders(session, [orderId]));

    return res.json({ success: true });
  }
}

export type FetchOrdersResponse = Awaited<ReturnType<typeof getOrderPage>>;

export type FetchOrderResponse = Awaited<ReturnType<typeof getOrder>>;

export type FetchOrderLineItemsResponse = NonNullable<Awaited<ReturnType<typeof getOrderLineItems>>>;

export type SyncOrderResponse = { success: true };
