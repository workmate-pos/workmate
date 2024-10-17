import { sql } from '../db/sql-tag.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export async function getShopMetafields(shop: string, objectIdQuery?: string) {
  return await sql<{
    id: number;
    shop: string;
    objectId: string;
    metafieldId: string;
    namespace: string;
    key: string;
    value: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "Metafield"
    WHERE shop = ${shop}
      AND "objectId" LIKE COALESCE(${objectIdQuery ?? null}, "objectId")
  `;
}

export async function findMetafields(
  shop: string,
  filters: {
    namespace: string;
    key: string;
    value: string;
  }[],
  objectIdQuery?: string,
) {
  if (!isNonEmptyArray(filters)) {
    return [];
  }

  const { namespace, key, value } = nest(filters);

  return await sql<{
    id: number;
    shop: string;
    objectId: string;
    metafieldId: string;
    namespace: string;
    key: string;
    value: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "Metafield"
    WHERE shop = ${shop}
      AND "objectId" LIKE COALESCE(${objectIdQuery ?? null}, "objectId")
      AND (namespace, key, value) IN (SELECT *
                                      FROM UNNEST(
                                        ${namespace} :: text[],
                                        ${key} :: text[],
                                        ${value} :: text[]
                                           ))
  `;
}

export async function upsertMetafields(
  shop: string,
  metafields: {
    objectId: ID;
    metafieldId: ID;
    namespace: string;
    key: string;
    value: string;
  }[],
) {
  if (!isNonEmptyArray(metafields)) {
    return;
  }

  const { objectId, metafieldId, namespace, key, value } = nest(metafields);

  const _objectId: string[] = objectId;
  const _metafieldId: string[] = metafieldId;

  await sql`
    INSERT INTO "Metafield" (shop, "objectId", "metafieldId", namespace, key, value)
    SELECT ${shop}, *
    FROM UNNEST(
      ${_objectId} :: text[],
      ${_metafieldId} :: text[],
      ${namespace} :: text[],
      ${key} :: text[],
      ${value} :: text[]
         )
    ON CONFLICT ("objectId", namespace, key)
      DO UPDATE SET "shop"        = EXCLUDED."shop",
                    "objectId"    = EXCLUDED."objectId",
                    "metafieldId" = EXCLUDED."metafieldId",
                    namespace     = EXCLUDED.namespace,
                    key           = EXCLUDED.key,
                    value         = EXCLUDED.value,
                    "updatedAt"   = EXCLUDED."updatedAt";
  `;
}

export async function removeObjectMetafields(shop: string, objectIds: ID[]) {
  if (objectIds.length === 0) {
    return;
  }

  await sql`
    DELETE
    FROM "Metafield"
    WHERE shop = ${shop}
      AND "objectId" = ANY (${objectIds as string[]} :: text[]);
  `;
}

export async function removeMetafields(
  shop: string,
  filters: {
    namespace: string;
    key: string;
  }[],
  objectIdQuery?: string,
) {
  if (!isNonEmptyArray(filters)) {
    return;
  }

  const { namespace, key } = nest(filters);

  await sql`
    DELETE
    FROM "Metafield"
    WHERE shop = ${shop}
      AND "objectId" LIKE COALESCE(${objectIdQuery ?? null}, "objectId")
      AND (namespace, key) IN (SELECT *
                               FROM UNNEST(
                                 ${namespace} :: text[],
                                 ${key} :: text[]
                                    ))
  `;
}
