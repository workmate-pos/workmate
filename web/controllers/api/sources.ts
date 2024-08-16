import { Authenticated, BodySchema, Get, Post } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Session } from '@shopify/shopify-api';
import { reserveLineItemQuantity } from '../../services/sourcing/reserve.js';
import { ReserveInventoryForLineItems } from '../../schemas/generated/reserve-inventory-for-line-items.js';
import { unit } from '../../services/db/unit-of-work.js';
import { getLineItemSources } from '../../services/sourcing/line-item-sources.js';

@Authenticated()
export default class LineItemsController {
  @Get('/line-item/:id')
  async fetchLineItemSources(req: Request<{ id: string }>, res: Response<LineItemSourcesResponse>) {
    const id = createGid('LineItem', req.params.id);

    return res.json({
      id,
      sources: await getLineItemSources(id),
    });
  }

  @Get('/draft-line-item/:id')
  async fetchDraftLineItemSources(req: Request<{ id: string }>, res: Response<LineItemSourcesResponse>) {
    const id = createGid('DraftOrderLineItem', req.params.id);

    return res.json({
      id,
      sources: await getLineItemSources(id),
    });
  }

  @Post('/line-items/reserve')
  @BodySchema('reserve-inventory-for-line-items')
  async reserveInventoryForLineItems(
    req: Request<unknown, unknown, ReserveInventoryForLineItems>,
    res: Response<ReserveInventoryForLineItemsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { reservations } = req.body;

    await unit(() =>
      Promise.all(
        reservations.map(({ quantity, locationId, lineItemId }) =>
          reserveLineItemQuantity(session, locationId, lineItemId, quantity),
        ),
      ),
    );

    return res.json({
      lineItems: await Promise.all(
        reservations.map(async ({ lineItemId }) => ({
          id: lineItemId,
          sources: await getLineItemSources(lineItemId),
        })),
      ),
    });
  }
}

type LineItemSources = {
  id: ID;
  sources: {
    reservations: number;
    purchaseOrders: number;
    transferOrders: number;
  };
};

export type LineItemSourcesResponse = LineItemSources;

export type ReserveInventoryForLineItemsResponse = {
  lineItems: LineItemSources[];
};
