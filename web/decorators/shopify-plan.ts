import { shopify } from '@teifi-digital/shopify-app-toolbox';
import { decorator, DecoratorHandler } from '@teifi-digital/shopify-app-express/decorators';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { RequestHandler } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { getShopType } from '../services/shop.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export type ShopifyPlanHandlerParam = {
  shopTypes: shopify.ShopPlanType[];
};

export const ShopifyPlanKey = 'shopify-plan';
export function ShopifyPlan(shopTypes: shopify.ShopPlanType[]) {
  return decorator<ShopifyPlanHandlerParam>(ShopifyPlanKey, { shopTypes });
}

const DEVELOPMENT_PLANS: shopify.ShopPlanType[] = ['DEVELOPMENT', 'PARTNER_DEVELOPMENT'];

export const shopifyPlanHandler: DecoratorHandler<ShopifyPlanHandlerParam> = ([{ shopTypes } = never()]) => {
  return (async (_req, res, next) => {
    const session: Session = res.locals.shopify.session;
    const graphql = new Graphql(session);

    const shopPlan = await getShopType(graphql).catch(() => null);

    if (!shopPlan) {
      // dont wanna block working features for unknown shop plans, so just hope it works. graphql will error if not
      return next();
    }

    if (!shopTypes.includes(shopPlan) && !DEVELOPMENT_PLANS.includes(shopPlan)) {
      throw new HttpError('Your Shopify Plan does not support this feature', 401);
    }

    return next();
  }) as RequestHandler;
};
