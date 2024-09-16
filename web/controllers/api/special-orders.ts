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
import { getSpecialOrder } from '../../services/special-orders/queries.js';
import { sendNotification } from '../../services/notifications/strategies/strategy.js';
import { match } from 'ts-pattern';
import { SendNotification } from '../../schemas/generated/send-notification.js';
import { upsertSpecialOrderNotifications } from '../../services/notifications/queries.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariants } from '../../services/product-variants/queries.js';
import { getProducts } from '../../services/products/queries.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { renderLiquid } from '../../services/liquid/render.js';

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

  // TODO: Call this from POs when PO items are received, SPO is created, etc
  @Post('/:name/notification')
  @Authenticated()
  @BodySchema('send-notification')
  async sendSpecialOrderNotification(
    req: Request<{ name: string }, unknown, SendNotification>,
    res: Response<SendNotificationResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { shop } = session;
    const { name } = req.params;
    const { notification } = req.body;

    const specialOrder = await getDetailedSpecialOrder(session, name);

    if (!specialOrder) {
      throw new HttpError(`Special order ${name} not found`, 404);
    }

    const productVariantIds = unique(specialOrder.lineItems.map(lineItem => lineItem.productVariantId));
    const [{ id }, productVariants] = await Promise.all([
      getSpecialOrder({ shop, name }).then(so => so ?? never('just checked')),
      getProductVariants(productVariantIds),
    ]);

    const productIds = unique(productVariants.map(variant => variant.productId));
    const products = await getProducts(productIds);

    const variables = {
      name: specialOrder.name,
      customer: {
        displayName: specialOrder.customer.displayName,
        phone: specialOrder.customer.phone,
        email: specialOrder.customer.email,
      },
      location: {
        name: specialOrder.location.name,
      },
      note: specialOrder.note,
      lineItems: specialOrder.lineItems.map(({ productVariantId, quantity, purchaseOrderLineItems }) => {
        const productVariant = productVariants.find(variant => variant.productVariantId === productVariantId);
        const product = products.find(product => product.productId === productVariant?.productId);

        const displayName =
          (!!productVariant && !!product ? getProductVariantName({ ...productVariant, product }) : null) ??
          'Unknown product';

        return {
          quantity,
          availableQuantity: sum(purchaseOrderLineItems.map(lineItem => lineItem.availableQuantity)),
          displayName,
        };
      }),
    };

    const uuid = await match(notification)
      .with({ type: 'sms' }, async ({ message, recipient }) =>
        sendNotification('sms', { shop, message: await renderLiquid(message, variables), recipient }, {}),
      )
      .with({ type: 'email' }, async ({ from, replyTo, recipient, ...notification }) => {
        const [subject, message] = await Promise.all([
          renderLiquid(notification.subject, variables),
          renderLiquid(notification.message, variables),
        ]);

        return sendNotification('email', { shop, message, recipient }, { subject, replyTo, from });
      })
      .exhaustive();

    await upsertSpecialOrderNotifications(id, [uuid]);

    return res.json({ success: true });
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

export type SendNotificationResponse = { success: true };
