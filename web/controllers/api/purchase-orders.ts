import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { db } from '../../services/db/db.js';
import type { Request, Response } from 'express-serve-static-core';
import { Permission } from '../../decorators/permission.js';
import { PurchaseOrderPaginationOptions } from '../../schemas/generated/purchase-order-pagination-options.js';
import { Session } from '@shopify/shopify-api';
import { escapeLike } from '../../services/db/like.js';
import { IGetPageResult } from '../../services/db/queries/generated/purchase-order.sql.js';

@Authenticated()
export default class PurchaseOrdersController {
  @Get('/')
  @QuerySchema('purchase-order-pagination-options')
  @Permission('read_purchase_orders')
  async getPurchaseOrders(
    req: Request<unknown, unknown, unknown, PurchaseOrderPaginationOptions>,
    res: Response<PurchaseOrderInfoPage>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    if (paginationOptions.query) {
      paginationOptions.query = `%${escapeLike(paginationOptions.query)}%`;
    }

    const purchaseOrders = await db.purchaseOrder.getPage({ ...paginationOptions, shop });

    return res.json({ purchaseOrders });
  }
}

export type PurchaseOrderInfoPage = {
  purchaseOrders: IGetPageResult[];
};
