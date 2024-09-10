import { sql } from '../db/sql-tag.js';
import { createPartitionedBatchedFunction } from '../../util/batching.js';
import { getTransactionUuid } from '../db/client.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';

export const getShopifyObject = createPartitionedBatchedFunction((shop: string, key: string) => ({
  key: getTransactionUuid(),
  argument: { shop, key },
  maxBatchSize: 250,
  maxBatchTimeMs: 2,
  process: async shopKeyPairs => {
    if (!isNonEmptyArray(shopKeyPairs)) {
      return [];
    }

    const { shop, key } = nest(shopKeyPairs);

    const shopifyObjects = await sql<{
      id: number;
      shop: string;
      key: string;
      data: unknown;
      stale: boolean;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }>`
      SELECT *
      FROM "ShopifyObject" so
      WHERE (so.shop, so.key) IN (SELECT *
                                  FROM UNNEST(
                                    ${shop} :: text[],
                                    ${key} :: text[]
                                       ));
    `;

    return shopKeyPairs.map(({ shop, key }) => shopifyObjects.find(so => so.shop === shop && so.key === key) ?? null);
  },
}));

// TODO: Batch these too

export async function softDeleteShopifyObject(shop: string, key: string) {
  await sql`
    UPDATE "ShopifyObject"
    SET "deletedAt" = NOW()
    WHERE shop = ${shop}
      AND key = ${key}
      AND "deletedAt" IS NULL;
  `;
}

export async function upsertShopifyObject(shop: string, key: string, data: unknown, stale: boolean) {
  // TODO: verify that this not stringify twice
  await sql`
    INSERT INTO "ShopifyObject" ("shop", key, data, stale)
    SELECT ${shop}, ${key}, ${JSON.stringify(data)} :: jsonb, ${stale}
    ON CONFLICT ("shop", key)
      DO UPDATE SET "data"  = EXCLUDED."data",
                    "stale" = EXCLUDED."stale";
  `;
}

export async function markShopifyObjectStale(shop: string, key: string) {
  await sql`
    UPDATE "ShopifyObject"
    SET "stale" = TRUE
    WHERE shop = ${shop}
      AND key = ${key};
  `;
}
