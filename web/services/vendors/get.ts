import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../gql/gql.js';
import { resolveNamespace } from '../app/index.js';
import { customerIsVendorMetafield } from '../metafields/customer-is-vendor-metafield.js';
import { PaginationOptionsWithoutQuery } from '../../schemas/generated/pagination-options-without-query.js';

export async function getVendors(session: Session, paginationOptions: PaginationOptionsWithoutQuery) {
  const graphql = new Graphql(session);
  const query = `metafields.${await resolveNamespace(session, customerIsVendorMetafield.namespace)}.${customerIsVendorMetafield.key} = true`;

  const { customerSegmentMembers } = await gql.segments.getCustomerSegmentByQuery.run(graphql, {
    ...paginationOptions,
    query,
  });

  return {
    nodes: customerSegmentMembers.edges.map(({ node }) => node),
    pageInfo: customerSegmentMembers.pageInfo,
  };
}
