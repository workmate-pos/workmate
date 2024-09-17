import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { syncProducts } from '../products/sync.js';
import { unit } from '../db/unit-of-work.js';
import { createIsStaleFn } from '../../util/db.js';
import { escapeTransaction } from '../db/client.js';
import { getProductVariants, upsertProductVariants } from './queries.js';

// TODO: Do we need webhooks for this anymore if we just update when stale?
// TODO: Update on stale everywhere where it makes sense

export async function ensureProductVariantsExist(session: Session, productVariantIds: ID[]) {
  if (productVariantIds.length === 0) {
    return;
  }

  const databaseProductVariants = await getProductVariants(productVariantIds);
  const existingProductVariantIds = new Set(
    databaseProductVariants.map(productVariant => productVariant.productVariantId),
  );
  const missingProductVariantIds = productVariantIds.filter(
    productVariantId => !existingProductVariantIds.has(productVariantId),
  );
  const staleProductVariantIds = databaseProductVariants
    .filter(createIsStaleFn())
    .map(productVariant => (assertGid(productVariant.productVariantId), productVariant.productVariantId));

  await Promise.all([
    escapeTransaction(() =>
      syncProductVariants(session, staleProductVariantIds).catch(error => {
        sentryErr(new Error('Error while updating stale product variants', { cause: error }), {
          staleProductVariantIds,
        });
      }),
    ),
    syncProductVariants(session, missingProductVariantIds),
  ]);
}

export async function syncProductVariantsIfExists(session: Session, productVariantIds: ID[]) {
  if (productVariantIds.length === 0) {
    return;
  }

  const databaseProductVariants = await getProductVariants(productVariantIds);
  const existingProductVariantIds = databaseProductVariants.map(
    productVariant => (assertGid(productVariant.productVariantId), productVariant.productVariantId),
  );

  await syncProductVariants(session, existingProductVariantIds);
}

export async function syncProductVariants(session: Session, productVariantIds: ID[]) {
  if (productVariantIds.length === 0) {
    return;
  }

  const graphql = new Graphql(session);
  const { nodes } = await gql.products.getManyProductVariantsForDatabase.run(graphql, { ids: productVariantIds });
  const productVariants = nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'ProductVariant'));
  const productIds = unique(productVariants.map(({ product: { id } }) => id));

  const errors: unknown[] = [];

  await unit(async () => {
    await syncProducts(session, productIds)
      .then(() => upsertGqlProductVariants(productVariants))
      .catch(error => errors.push(error));
  });

  if (productVariants.length !== productVariantIds.length) {
    errors.push(
      new Error(`Some product variants were not found (${productVariants.length}/${productVariantIds.length})`),
    );
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync product variants');
  }
}

export async function upsertGqlProductVariants(productVariants: gql.products.DatabaseProductVariantFragment.Result[]) {
  if (productVariants.length === 0) {
    return;
  }

  await upsertProductVariants(
    productVariants.map(
      ({ id: productVariantId, product: { id: productId }, inventoryItem: { id: inventoryItemId }, title, sku }) => ({
        productVariantId,
        productId,
        sku,
        title,
        inventoryItemId,
      }),
    ),
  );
}
