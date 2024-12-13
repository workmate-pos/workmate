import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { fetchAllPages, gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { syncProducts } from '../products/sync.js';
import { unit } from '../db/unit-of-work.js';
import { createIsStaleFn } from '../../util/db.js';
import { escapeTransaction } from '../db/client.js';
import { getProductVariants, upsertProductVariants } from './queries.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { removeObjectMetafields, upsertMetafields } from '../metafields/queries.js';
import { syncInventoryQuantities } from '../inventory/sync.js';
import { getProductVariantMetafieldsToSync } from '../metafields/sync.js';

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
  const [metafieldsToIndex, productVariants] = await Promise.all([
    getProductVariantMetafieldsToSync(session.shop),
    gql.products.getManyProductVariantsForDatabase.run(graphql, { ids: productVariantIds }).then(response =>
      Promise.all(
        response.nodes
          .filter(isNonNullable)
          .filter(hasPropertyValue('__typename', 'ProductVariant'))
          .map(async productVariant => {
            const metafields = await fetchAllPages(
              graphql,
              (graphql, variables) =>
                gql.products.getVariantMetafields.run(graphql, { ...variables, id: productVariant.id, first: 25 }),
              response => (response.productVariant ?? never()).metafields,
            );

            return {
              ...productVariant,
              metafields,
            };
          }),
      ),
    ),
  ]);

  const productIds = unique(productVariants.map(pv => pv.product.id));
  const inventoryItemIds = productVariants.map(pv => pv.inventoryItem.id);

  const errors: unknown[] = [];

  await unit(async () => {
    await removeObjectMetafields(session.shop, productVariantIds);

    await Promise.all([
      syncProducts(session, productIds)
        .then(() =>
          upsertProductVariants(
            productVariants.map(variant => ({
              ...variant,
              productId: variant.product.id,
              productVariantId: variant.id,
              inventoryItemId: variant.inventoryItem.id,
            })),
          ),
        )
        .catch(error => errors.push(error)),

      upsertMetafields(
        session.shop,
        productVariants.flatMap(productVariant =>
          productVariant.metafields
            .filter(metafield =>
              metafieldsToIndex.some(
                metafieldToIndex =>
                  metafieldToIndex.key === metafield.key && metafieldToIndex.namespace === metafield.namespace,
              ),
            )
            .map(metafield => ({
              objectId: productVariant.id,
              metafieldId: metafield.id,
              namespace: metafield.namespace,
              key: metafield.key,
              value: metafield.value,
            })),
        ),
      ),

      syncInventoryQuantities(session, inventoryItemIds).catch(error => errors.push(error)),
    ]);
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
