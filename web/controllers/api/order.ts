import type { Request, Response } from 'express-serve-static-core';
import type { Session } from '@shopify/shopify-api';
import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { getOrder, getOrderPage, getOrderLineItems } from '../../services/orders/get.js';
import { createGid, ID, isGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { WORK_ORDER_CUSTOM_ATTRIBUTE_NAME } from '@work-orders/work-order-shopify-order';
import { getWorkOrder } from '../../services/work-orders/queries.js';
import { cleanOrphanedDraftOrders } from '../../services/work-orders/clean-orphaned-draft-orders.js';
import { ensureShopifyOrdersExist, syncShopifyOrders } from '../../services/shopify-order/sync.js';
import { getShopifyOrder, getShopifyOrderLineItem, getShopifyOrderLineItems } from '../../services/orders/queries.js';
import {
  deleteLineItemSerials,
  getLineItemSerials,
  getOrderLineItemSerials,
  getSerialLineItemIds,
  getSerialsByIds,
  insertLineItemSerials,
} from '../../services/serials/queries.js';
import { SetOrderLineItemSerials } from '../../schemas/generated/set-order-line-item-serials.js';
import { unit } from '../../services/db/unit-of-work.js';
import { httpError } from '../../util/http-error.js';

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

  @Get('/:id/line-items/serials')
  async fetchOrderLineItemSerials(req: Request<{ id: string }>, res: Response<FetchOrderLineItemSerialsResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { id } = req.params;

    if (!isGid(id)) {
      throw new HttpError('Invalid order ID', 400);
    }

    const { objectName } = parseGid(id);

    if (objectName !== 'Order' && objectName !== 'DraftOrder') {
      throw new HttpError('Invalid order ID', 400);
    }

    const order = await getShopifyOrder({ shop, id });

    if (!order) {
      throw new HttpError('Order not found', 404);
    }

    const lineItemSerials = await getOrderLineItemSerials(order.orderId);

    return res.json(lineItemSerials);
  }

  @Post('/:id/line-items/serials')
  @BodySchema('set-order-line-item-serials')
  async setOrderLineItemSerials(
    req: Request<{ id: string }, unknown, SetOrderLineItemSerials>,
    res: Response<SetOrderLineItemSerialsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { id } = req.params;
    const { lineItemSerials } = req.body;

    if (!isGid(id)) {
      throw new HttpError('Invalid order ID', 400);
    }

    const { objectName } = parseGid(id);

    if (objectName !== 'Order' && objectName !== 'DraftOrder') {
      throw new HttpError('Invalid order ID', 400);
    }

    await ensureShopifyOrdersExist(session, [id]);

    const [order, lineItems] = await Promise.all([
      getShopifyOrder({ shop: session.shop, id }),
      getShopifyOrderLineItems(id),
    ]);

    if (!order) {
      throw new HttpError('Order not found', 404);
    }

    const productVariantSerials: Record<ID, Set<string>> = {};

    for (const { lineItemId, serial } of lineItemSerials) {
      const lineItem =
        lineItems.find(lineItem => lineItem.lineItemId === lineItemId) ?? httpError('Line item not found', 400);
      const productVariantId = lineItem.productVariantId;

      if (!productVariantId) {
        throw new HttpError(`${lineItem.title} cannot be assigned a serial`, 400);
      }

      if (productVariantSerials[productVariantId]?.has(serial)) {
        throw new HttpError(`Cannot assign serial ${serial} more than once`, 400);
      }

      productVariantSerials[productVariantId] ??= new Set();
      productVariantSerials[productVariantId].add(serial);
    }

    return await unit(async () => {
      await deleteLineItemSerials(
        session.shop,
        lineItems.map(({ lineItemId }) => lineItemId),
      );

      // ensure that we do not assign sold serials to multiple non-returned line items
      // in case the serial is returned, `sold` will be set to false again
      // TODO: Support return flow
      // TODO: Automatically mark serials as sold based on order and return flow
      const serialLineItemIds = await getSerialLineItemIds(
        lineItemSerials.map(({ serial, lineItemId }) => {
          const lineItem =
            lineItems.find(lineItem => lineItem.lineItemId === lineItemId) ?? httpError('Line item not found', 400);

          if (!lineItem.productVariantId) {
            throw new HttpError(`${lineItem.title} cannot be assigned a serial`, 400);
          }

          return { serial, productVariantId: lineItem.productVariantId };
        }),
        { sold: true },
      );

      // TODO: Ensure that serials are not duplicate

      if (serialLineItemIds.length) {
        throw new HttpError(`Serials are already in use (${serialLineItemIds.map(({ serial }) => serial).join(', ')})`);
      }

      await insertLineItemSerials(session.shop, lineItemSerials);

      const newLineItemSerials = await getOrderLineItemSerials(order.orderId);

      return res.json(newLineItemSerials);
    });
  }
}

export type FetchOrdersResponse = Awaited<ReturnType<typeof getOrderPage>>;

export type FetchOrderResponse = Awaited<ReturnType<typeof getOrder>>;

export type FetchOrderLineItemsResponse = NonNullable<Awaited<ReturnType<typeof getOrderLineItems>>>;

export type SyncOrderResponse = { success: true };

export type FetchOrderLineItemSerialsResponse = { lineItemId: ID; serial: string }[];

export type SetOrderLineItemSerialsResponse = FetchOrderLineItemSerialsResponse;
