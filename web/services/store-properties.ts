import { Session } from '@shopify/shopify-api';
import { db } from './db/db.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from './gql/gql.js';
import { never } from '../util/never.js';

export async function getStoreProperties(session: Session) {
  const [storeProperties] = await db.storeProperties.get({ shop: session.shop });

  if (storeProperties) {
    return storeProperties;
  }

  return await updateStoreProperties(session);
}

export async function updateStoreProperties(session: Session) {
  const graphql = new Graphql(session);
  const result = await gql.store.getStoreProperties(graphql, {});
  const [storeProperties = never()] = await db.storeProperties.upsert({
    shop: session.shop,
    name: result.shop.name,
    currencyCode: result.shop.currencyCode,
    currencyFormat: result.shop.currencyFormats.moneyFormat,
  });

  return storeProperties;
}
