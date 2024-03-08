import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { db } from '../db/db.js';
import { gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ensureProductsExist } from '../products/sync.js';
import { unit } from '../db/unit-of-work.js';

export async function ensureProductVariantsExist(session: Session, productVariantIds: ID[]) {
  if (productVariantIds.length === 0) {
    return;
  }

  const databaseProductVariants = await db.productVariants.getMany({ productVariantIds });
  const existingProductVariantIds = new Set(
    databaseProductVariants.map(productVariant => productVariant.productVariantId),
  );
  const missingProductVariantIds = productVariantIds.filter(
    productVariantId => !existingProductVariantIds.has(productVariantId),
  );

  await syncProductVariants(session, missingProductVariantIds);
}

export async function syncProductVariantsIfExists(session: Session, productVariantIds: ID[]) {
  if (productVariantIds.length === 0) {
    return;
  }

  const databaseProductVariants = await db.productVariants.getMany({ productVariantIds });
  const existingProductVariantIds = databaseProductVariants.map(productVariant => {
    const productVariantId = productVariant.productVariantId;
    assertGid(productVariantId);
    return productVariantId;
  });

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
    await ensureProductsExist(session, productIds).catch(error => errors.push(error));
    await upsertProductVariants(productVariants).catch(error => errors.push(error));
  });

  if (productVariants.length !== productVariants.length) {
    errors.push(
      new Error(`Some product variants were not found (${productVariants.length}/${productVariants.length})`),
    );
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync product variants');
  }
}

export async function upsertProductVariants(productVariants: gql.products.DatabaseProductVariantFragment.Result[]) {
  if (productVariants.length === 0) {
    return;
  }

  await unit(async () => {
    for (const {
      id: productVariantId,
      product: { id: productId },
      inventoryItem: { id: inventoryItemId },
      title,
      sku,
    } of productVariants) {
      await db.productVariants.upsert({
        productVariantId,
        productId,
        sku,
        title,
        inventoryItemId,
      });
    }
  });
}
