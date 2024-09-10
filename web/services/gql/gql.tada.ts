import { initGraphQLTada } from 'gql.tada';
import { Decimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { introspection } from '../../graphql-env.js';
import { Client, fetchExchange } from '@urql/core';
import { Session } from '@shopify/shopify-api';
import { apiVersion } from '../../index.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export const graphql = initGraphQLTada<{
  introspection: introspection;
  disableMasking: true;
  scalars: {
    FormattedString: string;
    URL: string;
    Money: Money;
    Decimal: Decimal;
    HTML: String;
    ID: ID;
    DateTime: string & { __brand: 'DateTime' };
    String: string;
  };
}>();

/**
 * Shopify's graphql client does not support document nodes, let alone typed document nodes 🥴
 * So just use urql
 */
export function createGraphqlClient(session: Session) {
  if (!session.accessToken) {
    throw new HttpError('Session has no access token', 500);
  }

  return new Client({
    url: `https://${session.shop}/admin/api/${apiVersion}/graphql.json`,
    exchanges: [fetchExchange],
    fetchOptions: {
      headers: {
        'X-Shopify-Access-Token': session.accessToken,
      },
    },
  });
}
