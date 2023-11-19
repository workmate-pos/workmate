import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from './gql/gql.js';
import { db } from './db/db.js';

export async function synchronizeCustomers(session: Session) {
  const graphql = new Graphql(session);
  const { shop } = session;

  let hasNextPage = true;
  let after: string | null = null;
  while (hasNextPage) {
    const response = await gql.customer.getCustomers(graphql, { first: 100, after });

    hasNextPage = response.customers.pageInfo.hasNextPage;
    after = response.customers.pageInfo.endCursor ?? null;

    for (const {
      node: { id, displayName: name, email, phone },
    } of response.customers.edges) {
      await db.customer.upsert({ id, shop, name, email, phone });
    }
  }
}
