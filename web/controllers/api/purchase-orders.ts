import {
  Authenticated,
  BodySchema,
  Get,
  Post,
  QuerySchema,
} from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import type { Request, Response } from 'express-serve-static-core';
import { Permission } from '../../decorators/permission.js';
import { PurchaseOrderPaginationOptions } from '../../schemas/generated/purchase-order-pagination-options.js';
import { Session } from '@shopify/shopify-api';
import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { upsertPurchaseOrder } from '../../services/purchase-orders/upsert.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';
import { getPurchaseOrder, getPurchaseOrderInfoPage } from '../../services/purchase-orders/get.js';
import { PurchaseOrder, PurchaseOrderInfo } from '../../services/purchase-orders/types.js';

@Authenticated()
export default class PurchaseOrdersController {
  @Post('/')
  @BodySchema('create-purchase-order')
  @Permission('write_purchase_orders')
  async createPurchaseOrder(
    req: Request<unknown, unknown, CreatePurchaseOrder>,
    res: Response<CreatePurchaseOrderResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const createPurchaseOrder = req.body;

    const { name } = await upsertPurchaseOrder(session, createPurchaseOrder);

    return res.json({ name });
  }

  @Get('/:name')
  @Permission('read_purchase_orders')
  async fetchPurchaseOrder(req: Request<{ name: string }>, res: Response<FetchPurchaseOrderResponse>) {
    const session: Session = res.locals.shopify.session;
    const { name } = req.params;

    const purchaseOrder = await getPurchaseOrder(session, name);

    if (!purchaseOrder) {
      throw new HttpError('Purchase order not found', 404);
    }

    return res.json({ purchaseOrder });
  }

  @Get('/')
  @QuerySchema('purchase-order-pagination-options')
  @Permission('read_purchase_orders')
  async fetchPurchaseOrderPage(
    req: Request<unknown, unknown, unknown, PurchaseOrderPaginationOptions>,
    res: Response<FetchPurchaseOrderInfoPageResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const purchaseOrders = await getPurchaseOrderInfoPage(session, paginationOptions);

    return res.json({ purchaseOrders });
  }
}

export type FetchPurchaseOrderInfoPageResponse = {
  purchaseOrders: PurchaseOrderInfo[];
};

export type CreatePurchaseOrderResponse = {
  name: string;
};

export type FetchPurchaseOrderResponse = {
  purchaseOrder: PurchaseOrder;
};
