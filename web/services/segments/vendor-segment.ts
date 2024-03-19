import { SegmentDefinition } from './installable-segment-service.js';
import { customerIsVendorMetafield } from '../metafields/customer-is-vendor-metafield.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';

export const vendorSegment: SegmentDefinition = async (graphql: Graphql) => {
  const {
    metafieldDefinitions: {
      nodes: [customerIsVendor],
    },
  } = await gql.metafields.getDefinition.run(graphql, {
    namespace: customerIsVendorMetafield.namespace,
    key: customerIsVendorMetafield.key,
    ownerType: customerIsVendorMetafield.ownerType,
  });

  if (!customerIsVendor) {
    throw new Error('Customer is vendor metafield not found');
  }

  return {
    name: 'WorkMate Vendors',
    query: `metafields.${customerIsVendor.namespace}.${customerIsVendorMetafield.key} = true`,
  };
};
