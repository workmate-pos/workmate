import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { db } from '../db/db.js';
import { gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unit } from '../db/unit-of-work.js';

export async function ensureProductsExist(session: Session, productIds: ID[]) {
  if (productIds.length === 0) {
    return;
  }

  const databaseProducts = await db.products.getMany({ productIds });
  const existingProductIds = new Set(databaseProducts.map(product => product.productId));
  const missingProductIds = productIds.filter(productId => !existingProductIds.has(productId));

  await syncProducts(session, missingProductIds);
}

export async function syncProductsIfExists(session: Session, productIds: ID[]) {
  if (productIds.length === 0) {
    return;
  }

  const databaseProducts = await db.products.getMany({ productIds });
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
  const products = nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'Product'));

  const errors: unknown[] = [];

  await upsertProducts(session.shop, products).catch(e => errors.push(e));

  if (products.length !== productIds.length) {
    errors.push(new Error(`Some products were not found (${products.length}/${productIds.length})`));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync products');
  }
}

export async function upsertProducts(shop: string, products: gql.products.DatabaseProductFragment.Result[]) {
  if (products.length === 0) {
    return;
  }

  await unit(async () => {
    for (const { id: productId, title, handle, description } of products) {
      await db.products.upsert({ shop, productId, title, handle, description });
    }
  });
}
