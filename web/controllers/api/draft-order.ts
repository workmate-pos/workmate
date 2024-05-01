import type { Request, Response } from 'express-serve-static-core';
import type { Session } from '@shopify/shopify-api';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getDraftOrder, getDraftOrderLineItems, getDraftOrderPage } from '../../services/draft-orders/get.js';

@Authenticated()
export default class DraftOrderController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchOrders(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchDraftOrdersResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const draftOrders = await getDraftOrderPage(session, paginationOptions);

    return res.json(draftOrders);
  }

  @Get('/:id')
  async fetchOrder(req: Request<{ id: string }>, res: Response<FetchDraftOrderResponse>) {
    const session: Session = res.locals.shopify.session;

    const gid = createGid('DraftOrder', req.params.id);
    const order = await getDraftOrder(session, gid);

    return res.json(order);
  }

  @Get('/:id/line-items')
  @QuerySchema('pagination-options')
  async fetchOrderLineItems(
    req: Request<{ id: string }, unknown, unknown, PaginationOptions>,
    res: Response<FetchDraftOrderLineItemsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const gid = createGid('DraftOrder', req.params.id);
    const lineItems = await getDraftOrderLineItems(session, gid, paginationOptions);

    if (!lineItems) {
      throw new HttpError('Draft order not found', 404);
    }

    return res.json(lineItems);
  }
}

export type FetchDraftOrdersResponse = Awaited<ReturnType<typeof getDraftOrderPage>>;

export type FetchDraftOrderResponse = Awaited<ReturnType<typeof getDraftOrder>>;

export type FetchDraftOrderLineItemsResponse = NonNullable<Awaited<ReturnType<typeof getDraftOrderLineItems>>>;
