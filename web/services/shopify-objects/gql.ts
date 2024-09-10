import { createGraphqlClient, graphql } from '../gql/gql.tada.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Session } from '@shopify/shopify-api';
import { httpError } from '../../util/http-error.js';
import { createPartitionedBatchedFunction } from '../../util/batching.js';

// TODO: Listen for metaobject webhook and sync all things that are in the referencedBy
// TODO: Alternatively, store metafields separately instead of inside a product cache
const fixedPriceLabourChargeMetaobjectFragment = graphql(`
  fragment fixedPriceLabourChargeMetaobjectFragment on Metaobject {
    id
    type
    name: field(key: "name") {
      jsonValue
    }
    amount: field(key: "amount") {
      jsonValue
    }
    customizeAmount: field(key: "customize-amount") {
      jsonValue
    }
    removable: field(key: "removable") {
      jsonValue
    }
  }
`);

const hourlyLabourChargeMetaobjectFragment = graphql(`
  fragment hourlyLabourChargeMetaobjectFragment on Metaobject {
    id
    type
    name: field(key: "name") {
      jsonValue
    }
    rate: field(key: "rate") {
      jsonValue
    }
    hours: field(key: "hours") {
      jsonValue
    }
    customizeRate: field(key: "customize-rate") {
      jsonValue
    }
    #    TODO: Investiate why this sometimes has a jsonValue that is not bool - not the case for removable
    customizeHours: field(key: "customize-hours") {
      jsonValue
    }
    removable: field(key: "removable") {
      jsonValue
    }
  }
`);

const productVariantFragment = graphql(
  `
    fragment productVariantFragment on ProductVariant {
      id
      title
      sku
      price
      barcode
      image {
        altText
        id
        url
      }
      inventoryItem {
        id
        unitCost {
          currencyCode
          amount
        }
      }
      product {
        id
      }
      requiresComponents
      defaultCharges: metafield(namespace: "$app", key: "default-charges") {
        id
        references(first: 10) {
          nodes {
            __typename
            ...fixedPriceLabourChargeMetaobjectFragment
            ...hourlyLabourChargeMetaobjectFragment
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `,
  [fixedPriceLabourChargeMetaobjectFragment, hourlyLabourChargeMetaobjectFragment],
);

const nodesQuery = graphql(
  `
    query getNodes($ids: [ID!]!) {
      nodes(ids: $ids) {
        __typename
        ...productVariantFragment
        ...fixedPriceLabourChargeMetaobjectFragment
        ...hourlyLabourChargeMetaobjectFragment
      }
    }
  `,
  [productVariantFragment, fixedPriceLabourChargeMetaobjectFragment, hourlyLabourChargeMetaobjectFragment],
);

export const fetchNode = createPartitionedBatchedFunction((session: Session, id: ID) => ({
  key: session.shop,
  argument: id,
  maxBatchSize: 50,
  maxBatchTimeMs: 10,
  process: async (ids: ID[]) => {
    const graphql = createGraphqlClient(session);
    const { data } = await graphql.query(nodesQuery, { ids });
    return data?.nodes ?? httpError('Did not receive a response from Shopify GraphQL API', 500);
  },
}));

export const fetchTypedNode = async <const T>(session: Session, id: ID, __typename: T) => {
  const node = await fetchNode(session, id);

  if (!node) {
    return null;
  }

  if (node.__typename !== __typename) {
    throw new Error(`Expected node to be of type ${__typename}, but got ${node.__typename}`);
  }

  return node as typeof node & { __typename: T };
};
