import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from './gql/gql.js';
import { db } from './db/db.js';

export async function synchronizeEmployees(session: Session) {
  const graphql = new Graphql(session);
  const { shop } = session;

  let hasNextPage = true;
  let after: string | null = null;
  while (hasNextPage) {
    const response = await gql.staffMember.getStaffMembers(graphql, { first: 100, after });

    hasNextPage = response.shop.staffMembers.pageInfo.hasNextPage;
    after = response.shop.staffMembers.pageInfo.endCursor ?? null;

    for (const {
      node: { id, name },
    } of response.shop.staffMembers.edges) {
      await db.employee.upsert({ id, shop, name });
    }
  }
}
