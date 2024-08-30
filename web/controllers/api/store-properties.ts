import { Session } from '@shopify/shopify-api';
import { Authenticated, Get } from '@teifi-digital/shopify-app-express/decorators';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../../services/gql/gql.js';
import { Request, Response } from 'express-serve-static-core';
import { CurrencyCode } from '../../services/gql/queries/generated/schema.js';
import { getShopType } from '../../services/shop.js';
import { ShopPlanType } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

@Authenticated()
export default class StorePropertiesController {
  @Get('/')
  async fetchStoreProperties(req: Request, res: Response<FetchStorePropertiesResponse>) {
    const session: Session = res.locals.shopify.session;

    const graphql = new Graphql(session);
    const [response, plan] = await Promise.all([gql.store.getProperties.run(graphql, {}), getShopType(graphql)]);

    const storeProperties = {
      name: response.shop.name,
      currencyCode: response.shop.currencyCode,
      currencyFormat: response.shop.currencyFormats.moneyFormat,
      plan,
    };

    return res.json({ storeProperties });
  }
}

export type FetchStorePropertiesResponse = {
  storeProperties: {
    name: string;
    currencyCode: CurrencyCode;
    currencyFormat: string;
    plan: ShopPlanType;
  };
};
