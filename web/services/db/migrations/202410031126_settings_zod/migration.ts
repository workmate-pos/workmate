import { transaction } from '../../transaction.js';
import { db } from '../../db.js';
import { sql } from '../../sql-tag.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { parseShopSettings, ShopSettings } from '../../../settings/schema.js';
import { updateShopSettings } from '../../../settings/settings.js';
import { ShopSettings01 } from '../../../settings/versions/01.js';

/**
 * Migrate from the current settings json schema to zod.
 * Simply fetch current schema and replace them with a json blob backed by zod.
 */
export default async function migrate() {
  await transaction(async () => {
    const settings = await sql<{ shop: string; key: string; value: string; createdAt: Date; updatedAt: Date }>`
      SELECT *
      FROM "Settings";
    `;

    await sql`
      TRUNCATE TABLE "Settings";
    `;

    const shops = unique(settings.map(setting => setting.shop));

    for (const shop of shops) {
      const obj = settings
        .filter(setting => setting.shop === shop)
        .reduce((acc, current) => ({ ...acc, [current.key]: deeplyStripNulls(JSON.parse(current.value)) }), {});

      await updateShopSettings(shop, parseShopSettings(ShopSettings01.parse(obj)));
    }
  });
}

function deeplyStripNulls(obj: unknown): unknown {
  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deeplyStripNulls);
  }

  if (obj === null) {
    return obj;
  }

  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, value]) => value !== null)
      .map(([key, value]) => [key, deeplyStripNulls(value)]),
  );
}
