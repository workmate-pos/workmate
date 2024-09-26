import { getShopMetafields, removeMetafields, upsertMetafields } from './queries.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { getShopSettings } from '../settings.js';
import { fetchAllPages, gql } from '../gql/gql.js';
import { httpError } from '../../util/http-error.js';
import { hasNestedPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { unit } from '../db/unit-of-work.js';
import { runLongRunningTask } from '../long-running-task/long-running-task.js';
import { ensureProductVariantsExist } from '../product-variants/sync.js';

const METAFIELD_DEFINITION_BATCH_SIZE = 100;
const METAFIELD_BATCH_SIZE = 100;

export function getSyncProductOrVariantMetafieldsTaskName(shop: string, type: 'product' | 'variant') {
  return `${shop}-${type}-metafields-sync`;
}

export async function syncProductOrVariantMetafields(session: Session, type: 'product' | 'variant') {
  const name = getSyncProductOrVariantMetafieldsTaskName(session.shop, type);

  return await runLongRunningTask(name, async ({ updateProgress }) => {
    const { shop } = session;
    const graphql = new Graphql(session);

    const gidObjectType = type === 'product' ? 'Product' : 'ProductVariant';
    const metafieldOwnerType = type === 'product' ? 'PRODUCT' : 'PRODUCTVARIANT';

    const [currentMetafields, { scanner }] = await Promise.all([
      getShopMetafields(shop, `gid://shopify/${gidObjectType}/%`),
      getShopSettings(session.shop),
    ]);

    if (scanner.variants.metafields[type].length === 0) {
      return;
    }

    const query = scanner.variants.metafields[type]
      .map(metafield => metafield.split('.') as [string, string])
      .map(([namespace, key]) => `(namespace:${namespace} AND key:${key})`)
      .join(' OR ');

    const metafieldDefinitions = await fetchAllPages(
      graphql,
      (graphql, variables) =>
        gql.metafields.getDefinitions.run(graphql, {
          ...variables,
          first: METAFIELD_DEFINITION_BATCH_SIZE,
          query,
          ownerType: metafieldOwnerType,
        }),
      response => {
        return response.metafieldDefinitions;
      },
    );

    await updateProgress({ progress: 0, progressMax: metafieldDefinitions.length });

    const newMetafields: { objectId: ID; metafieldId: ID; namespace: string; key: string; value: string }[] = [];
    const productVariantIds: ID[] = [];

    for (const [i, { id }] of metafieldDefinitions.entries()) {
      const metafields = await fetchAllPages(
        graphql,
        (graphql, variables) =>
          gql.metafields.getDefinitionMetafields.run(graphql, {
            ...variables,
            first: METAFIELD_BATCH_SIZE,
            definitionId: id,
          }),
        response =>
          response.metafieldDefinition?.metafields ??
          httpError('Metafield definition not found. It may have been deleted'),
      );

      newMetafields.push(
        ...metafields.filter(hasNestedPropertyValue('owner.__typename', gidObjectType)).map(metafield => ({
          ...metafield,
          objectId: metafield.owner.id,
          metafieldId: metafield.id,
        })),
      );

      productVariantIds.push(
        ...metafields
          .map(metafield => metafield.owner)
          .flatMap(metafield => {
            if (metafield.__typename === 'ProductVariant') {
              return [metafield.id];
            } else if (metafield.__typename === 'Product') {
              return metafield.variants.nodes.map(variant => variant.id);
            }

            return [];
          }),
      );

      await updateProgress({
        progress: i + 1,
        progressMax: metafieldDefinitions.length,
      });
    }

    const metafieldsToRemove = currentMetafields.filter(
      metafield =>
        !newMetafields.some(
          newMetafield => newMetafield.namespace === metafield.namespace && newMetafield.key === metafield.key,
        ),
    );

    await unit(async () => {
      await removeMetafields(shop, metafieldsToRemove, `gid://shopify/${gidObjectType}/%`);
      await upsertMetafields(shop, newMetafields);
    });

    await ensureProductVariantsExist(session, productVariantIds);
  });
}

export async function doesProductHaveSyncableMetafields(session: Session, productId: ID) {
  const { scanner } = await getShopSettings(session.shop);

  if (scanner.variants.metafields.product.length === 0 || scanner.variants.metafields.variant.length === 0) {
    return false;
  }

  const graphql = new Graphql(session);
  const response = await gql.products.getProductAndVariantMetafields.run(graphql, { id: productId });

  if (!response.product) {
    return false;
  }

  const isIndexedMetafield = (type: 'product' | 'variant', { namespace, key }: { namespace: string; key: string }) =>
    scanner.variants.metafields[type].includes(`${namespace}.${key}`);

  const isIndexedProductMetafield = (metafield: { namespace: string; key: string }) =>
    isIndexedMetafield('product', metafield);

  const isIndexedVariantMetafield = (metafield: { namespace: string; key: string }) =>
    isIndexedMetafield('variant', metafield);

  return (
    response.product.metafields.nodes.some(isIndexedProductMetafield) ||
    response.product.variants.nodes.flatMap(variant => variant.metafields.nodes).some(isIndexedVariantMetafield)
  );
}
