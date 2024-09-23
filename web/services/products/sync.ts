import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { fetchAllPages, gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProducts, upsertProducts } from './queries.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { upsertMetafields } from '../metafields/queries.js';

export async function ensureProductsExist(session: Session, productIds: ID[]) {
  if (productIds.length === 0) {
    return;
  }

  const databaseProducts = await getProducts(productIds);
  const existingProductIds = new Set(databaseProducts.map(product => product.productId));
  const missingProductIds = productIds.filter(productId => !existingProductIds.has(productId));

  await syncProducts(session, missingProductIds);
}

export async function syncProductsIfExists(session: Session, productIds: ID[]) {
  if (productIds.length === 0) {
    return;
  }

  const databaseProducts = await getProducts(productIds);
  const existingProductIds = databaseProducts.map(product => {
    const productId = product.productId;
    assertGid(productId);
    return productId;
  });

  await syncProducts(session, existingProductIds);
}

export async function syncProducts(session: Session, productIds: ID[]) {
  if (productIds.length === 0) {
    return;
  }

  const graphql = new Graphql(session);
  const { nodes } = await gql.products.getManyProductsForDatabase.run(graphql, { ids: productIds });
  const products = await Promise.all(
    nodes
      .filter(isNonNullable)
      .filter(hasPropertyValue('__typename', 'Product'))
      .map(async product => {
        const metafields = await fetchAllPages(
          graphql,
          (graphql, variables) =>
            gql.products.getProductMetafields.run(graphql, { ...variables, id: product.id, first: 25 }),
          response => (response.product ?? never()).metafields,
        );

        return {
          ...product,
          metafields,
        };
      }),
  );

  const errors: unknown[] = [];

  await Promise.all([
    upsertProducts(
      session.shop,
      products.map(product => ({ ...product, productId: product.id })),
    ),

    upsertMetafields(
      session.shop,
      products.flatMap(product =>
        product.metafields.map(metafield => ({
          objectId: product.id,
          metafieldId: metafield.id,
          namespace: metafield.namespace,
          key: metafield.key,
          value: metafield.value,
        })),
      ),
    ),
  ]);

  if (products.length !== productIds.length) {
    errors.push(new Error(`Some products were not found (${products.length}/${productIds.length})`));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync products');
  }
}
