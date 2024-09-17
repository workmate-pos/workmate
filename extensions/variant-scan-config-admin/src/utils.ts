import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

type JsonValue = string | null | number | boolean | JsonValue[] | { [key: string]: JsonValue };

export async function getAvailableMetafieldDefinitions(productId: ID) {
  type MetafieldDefinition = {
    name: string;
    namespace: string;
    description: string | null;
    key: string;
  };

  return await makeGraphQLQuery<{
    productMetafieldDefinitions: { nodes: MetafieldDefinition[] };
    variantMetafieldDefinitions: { nodes: MetafieldDefinition[] };

    product: null | {
      /**
       * We store the current setting in a product metafield.
       */
      scannableMetafields: null | {
        jsonValue: JsonValue;
      };
    };
  }>(
    `
      #graphql
      query($productId: ID!) {
        productMetafieldDefinitions: metafieldDefinitions(first: 250, ownerType: PRODUCT, query: "type:single_line_text_field") {
          nodes {
            name
            namespace
            description
            key
          }
        }

        variantMetafieldDefinitions: metafieldDefinitions(first: 250, ownerType: PRODUCTVARIANT, query: "type:single_line_text_field") {
          nodes {
            name
            namespace
            description
            key
          }
        }

        product(id: $productId) {
          scannableMetafields: metafield(namespace: "$app", key: "scannable-metafields") {
            jsonValue
          }
        }
      }
    `,
    { productId },
  );
}

export async function getVariant(variantId: ID) {
  return await makeGraphQLQuery<{
    productVariant: null | {
      metafields: {
        nodes: {
          namespace: string;
          key: string;
          value: string;
          type: string;
        }[];
      };

      /**
       * We store the current setting in an app metafield.
       */
      scannableMetafields: null | {
        jsonValue: JsonValue;
      };

      product: {
        metafields: {
          nodes: {
            namespace: string;
            key: string;
            value: string;
            type: string;
          }[];
        };
      };
    };
  }>(
    `
      #graphql
      query ($variantId: ID!) {
        productVariant(id: $variantId) {
          metafields(first: 250) {
            nodes {
              namespace
              key
              value
              type
            }
          }

          scannableMetafields: metafield(namespace: "$app", key: "scannable-metafields") {
            jsonValue
          }

          product {
            metafields(first: 250) {
              nodes {
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
    `,
    { variantId },
  );
}

async function makeGraphQLQuery<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<{
  data: T;
  extensions: {
    cost: {
      actualQueryCost: number;
      requestedQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}> {
  const graphQLQuery = {
    query,
    variables,
  };

  const res = await fetch('shopify:admin/api/graphql.json', {
    method: 'POST',
    body: JSON.stringify(graphQLQuery),
  });

  if (!res.ok) {
    console.error('Network error');
  }

  return await res.json();
}
