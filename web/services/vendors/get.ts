import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { fetchAllPages, gql } from '../gql/gql.js';
import { resolveNamespace } from '../app/index.js';
import { customerIsVendorMetafield } from '../metafields/customer-is-vendor-metafield.js';
import { CacheMap } from '../../util/CacheMap.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { MINUTE_IN_MILLIS } from '../../util/date-utils.js';

const vendorCustomersCache = new CacheMap<string, gql.segments.CustomerSegmentMemberFragment.Result[]>(
  30 * MINUTE_IN_MILLIS,
);

async function getVendorCustomers(session: Session) {
  if (vendorCustomersCache.has(session.shop)) {
    return vendorCustomersCache.get(session.shop) ?? never();
  }

  const graphql = new Graphql(session);
  const query = `metafields.${await resolveNamespace(session, customerIsVendorMetafield.namespace)}.${customerIsVendorMetafield.key} = true`;

  const result = await fetchAllPages(
    graphql,
    (graphql, variables) => gql.segments.getCustomerSegmentByQuery.run(graphql, { ...variables, query }),
    result => ({
      pageInfo: result.customerSegmentMembers.pageInfo,
      nodes: result.customerSegmentMembers.edges.map(({ node }) => node),
    }),
  );

  vendorCustomersCache.set(session.shop, result);

  return result;
}

/**
 * Get product vendors, and corresponding Customers to use as address.
 */
export async function getVendors(session: Session): Promise<Vendor[]> {
  const graphql = new Graphql(session);

  const [
    {
      shop: { productVendors },
    },
    vendorCustomers,
  ] = await Promise.all([gql.productVendors.getProductVendors.run(graphql, {}), getVendorCustomers(session)]);

  const vendorNames = productVendors.edges.map(({ node }) => node);

  return vendorNames.map(vendor => {
    const customer = vendorCustomers.find(customer => customer.displayName === vendor);

    return {
      name: vendor,
      customer: customer ?? null,
    };
  });
}

export type Vendor = {
  name: string;
  customer: gql.segments.CustomerSegmentMemberFragment.Result | null;
};
