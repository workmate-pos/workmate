import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { fetchAllPages, gql } from '../gql/gql.js';
import { resolveNamespace } from '../app/index.js';
import { customerIsVendorMetafield } from '../metafields/customer-is-vendor-metafield.js';
import { CacheMap } from '../../util/CacheMap.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { MINUTE_IN_MILLIS } from '../../util/date-utils.js';
import { getShopSettings } from '../settings.js';
import { Int } from '../gql/queries/generated/schema.js';

type CachedVendorCustomers = {
  /**
   * The metafields that are loaded can be changed in settings.
   * If they are indeed changed the cache will be invalidated.
   */
  metafields: string[];
  customers: gql.segments.CustomerSegmentMemberFragment.Result[];
};

const vendorCustomersCache = new CacheMap<string, CachedVendorCustomers>(30 * MINUTE_IN_MILLIS);

async function getVendorCustomers(session: Session) {
  const settings = await getShopSettings(session.shop);

  if (vendorCustomersCache.has(session.shop)) {
    const cacheValue = vendorCustomersCache.get(session.shop) ?? never();

    const newSettingsMetafields = Array.from(settings.vendorCustomerMetafieldsToShow).filter(
      metafield => !cacheValue.metafields.includes(metafield),
    );

    if (newSettingsMetafields.length === 0) {
      return cacheValue.customers;
    }

    // if there are new metafields to load we ignore the cached value
  }

  const graphql = new Graphql(session);
  const query = `metafields.${await resolveNamespace(session, customerIsVendorMetafield.namespace)}.${customerIsVendorMetafield.key} = true`;

  const customers = await fetchAllPages(
    graphql,
    (graphql, variables) =>
      gql.segments.getCustomerSegmentByQuery.run(graphql, {
        ...variables,
        query,
        metafieldCount: settings.vendorCustomerMetafieldsToShow.length as Int,
        metafields: settings.vendorCustomerMetafieldsToShow,
      }),
    result => ({
      pageInfo: result.customerSegmentMembers.pageInfo,
      nodes: result.customerSegmentMembers.edges.map(({ node }) => node),
    }),
  );

  vendorCustomersCache.set(session.shop, { customers: customers, metafields: settings.vendorCustomerMetafieldsToShow });

  return customers;
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
    const customer = vendorCustomers.find(customer => customer.displayName === vendor) ?? null;

    return {
      name: vendor,
      customer,
    };
  });
}

export type Vendor = {
  name: string;
  customer: gql.segments.CustomerSegmentMemberFragment.Result | null;
};
