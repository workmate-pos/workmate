import { sql } from '../../sql-tag.js';
import { getShopSettings, updateShopSettings } from '../../../settings/settings.js';
import { ShopSettings01 } from '../../../settings/versions/01.js';
import { transaction } from '../../transaction.js';
import { nest } from '../../../../util/db.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export default async function migrate() {
  await transaction(async () => {
    await deleteOldPrintTemplates();
    await insertOldPrintTemplates();

    const shops = await sql<{ shop: string }>`SELECT DISTINCT shop FROM "Settings";`.then(rows =>
      rows.map(row => row.shop),
    );

    for (const shop of shops) {
      const settings = await getShopSettings(shop);

      for (const [schemaKey, sqlKey] of [
        ['purchaseOrders', 'purchaseOrderPrintTemplates'],
        ['workOrders', 'workOrderPrintTemplates'],
      ] as const) {
        const [templates] = await sql<{ shop: string; key: string; value: string; createdAt: Date; updatedAt: Date }>`
        SELECT *
        FROM "Settings"
        WHERE shop = ${shop}
          AND key = ${sqlKey};
      `;

        if (!templates) {
          continue;
        }

        const currentTemplates = JSON.parse(templates.value);
        const parsedTemplates = ShopSettings01.shape[schemaKey].parse(JSON.parse(templates.value));
        const mergedTemplates = mergeRecords(parsedTemplates, currentTemplates);

        await updateShopSettings(shop, {
          ...settings,
          [schemaKey]: {
            ...settings[schemaKey],
            printTemplates: mergedTemplates,
          },
        });

        // merge with existing, changing the key to (1), (2), etc
      }
    }

    await deleteOldPrintTemplates();
  });
}

function mergeRecords<T>(newRecord: Record<string, T>, oldRecord: Record<string, T>) {
  const keyOccurrences: Record<string, number> = {};

  const merged: Record<string, T> = {};

  for (const [key, value] of [...Object.entries(newRecord), ...Object.entries(oldRecord)]) {
    if (merged[key] === value) {
      // no difference in the two so just keep the one
      continue;
    }

    const previousOccurrences = keyOccurrences[key] ?? 0;

    if (previousOccurrences > 1) {
      // should not be possible as were merging 2 settings
      throw new Error(`Duplicate key ${key}`);
    }

    keyOccurrences[key] = previousOccurrences + 1;

    merged[previousOccurrences === 0 ? key : `${key} (Restored)`] = value;
  }

  return merged;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

// insert the old print templates in the old format so we can redo the migration
async function insertOldPrintTemplates() {
  const data = JSON.parse(readFileSync(resolve(__dirname, 'data.json'), 'utf8')) as {
    shop: string;
    key: string;
    value: string;
  }[];

  if (!isNonEmptyArray(data)) {
    throw new Error('huh');
  }

  const { shop, key, value } = nest(data);

  await sql`
    INSERT INTO "Settings" (shop, key, value)
    SELECT *
    FROM UNNEST(
      ${shop} :: text[],
      ${key} :: text[],
      ${value} :: text[]
         );
  `;
}

async function deleteOldPrintTemplates() {
  await sql`
    DELETE
    FROM "Settings"
    WHERE key IN ('workOrderPrintTemplates', 'purchaseOrderPrintTemplates');
  `;
}
