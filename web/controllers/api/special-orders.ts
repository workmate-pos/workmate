import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Permission } from '../../decorators/permission.js';
import { Request, Response } from 'express-serve-static-core';
import { CreateSpecialOrder } from '../../schemas/generated/create-special-order.js';
import { Session } from '@shopify/shopify-api';
import { upsertCreateSpecialOrder } from '../../services/special-orders/upsert.js';
import { getDetailedSpecialOrder, getDetailedSpecialOrdersPage } from '../../services/special-orders/get.js';
import { DetailedSpecialOrder } from '../../services/special-orders/types.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { SpecialOrderPaginationOptions } from '../../schemas/generated/special-order-pagination-options.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

@Authenticated()
export default class SpecialOrdersController {
  @Post('/')
  @BodySchema('create-special-order')
  @Permission('write_special_orders')
  async createSpecialOrder(
    req: Request<unknown, unknown, CreateSpecialOrder>,
    res: Response<CreateSpecialOrderResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const createSpecialOrder = req.body;

    const { name } = await upsertCreateSpecialOrder(session, createSpecialOrder);
    const specialOrder = (await getDetailedSpecialOrder(session, name)) ?? never();

    return res.json({ specialOrder });
  }

  @Get('/:name')
  @Permission('read_special_orders')
  async fetchSpecialOrder(req: Request<{ name: string }>, res: Response<FetchSpecialOrderResponse>) {
    const session: Session = res.locals.shopify.session;
    const { name } = req.params;

    const specialOrder = await getDetailedSpecialOrder(session, name);

    if (!specialOrder) {
      throw new HttpError(`Special order ${name} not found`, 404);
    }

    return res.json({ specialOrder });
  }

  @Get('/')
  @QuerySchema('special-order-pagination-options')
  @Permission('read_special_orders')
  async fetchSpecialOrders(
    req: Request<unknown, unknown, unknown, SpecialOrderPaginationOptions>,
    res: Response<FetchSpecialOrdersResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const { specialOrders, hasNextPage } = await getDetailedSpecialOrdersPage(session, paginationOptions);

    return res.json({ specialOrders, hasNextPage });
  }
}

export type CreateSpecialOrderResponse = {
  specialOrder: DetailedSpecialOrder;
};

export type FetchSpecialOrderResponse = {
  specialOrder: DetailedSpecialOrder;
};

export type FetchSpecialOrdersResponse = {
  specialOrders: DetailedSpecialOrder[];
  hasNextPage: boolean;
};
