import { sql, sqlOne } from '../../db/sql-tag.js';

export async function getCustomFieldValueOptions({ shop, name }: { shop: string; name: string }) {
  const [options] = await sql<{ values: string[] | null }>`
    SELECT values
    FROM "CustomFieldValueOptions"
    WHERE shop = ${shop}
      AND name = ${name};`;

  return options?.values ?? [];
}

export async function upsertCustomFieldValueOptions({
  shop,
  name,
  values,
}: {
  shop: string;
  name: string;
  values: string[];
}) {
  const options = await sqlOne<{ values: string[] | null }>`
    INSERT INTO "CustomFieldValueOptions" (shop, name, values)
    VALUES (${shop}, ${name}, ${values})
    ON CONFLICT (shop, name)
      DO UPDATE SET values = EXCLUDED.values
    RETURNING values;
  `;

  return options.values ?? [];
}

export async function deleteCustomFieldValueOptions({ shop, name }: { shop: string; name: string }) {
  await sql`
    DELETE
    FROM "CustomFieldValueOptions"
    WHERE shop = ${shop}
      AND name = ${name};`;
}
