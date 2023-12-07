import { Session } from '@shopify/shopify-api';
import { Authenticated, Get } from '@teifi-digital/shopify-app-express/decorators/default';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../../services/gql/gql.js';
import { Request, Response } from 'express-serve-static-core';
import { CurrencyCode } from '../../services/gql/queries/generated/schema.js';

@Authenticated()
export default class StorePropertiesController {
  @Get('/')
  async fetchStoreProperties(req: Request, res: Response<FetchStorePropertiesResponse>) {
    const session: Session = res.locals.shopify.session;

    const graphql = new Graphql(session);
    const response = await gql.store.getStoreProperties(graphql, {});

    const storeProperties = {
      name: response.shop.name,
      currencyCode: response.shop.currencyCode,
      currencyFormat: response.shop.currencyFormats.moneyFormat,
    };

    return res.json({ storeProperties });
  }
}

export type FetchStorePropertiesResponse = {
  storeProperties: {
    name: string;
    currencyCode: CurrencyCode;
    currencyFormat: string;
  };
};
