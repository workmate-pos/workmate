import { sql } from '../db/sql-tag.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export async function getCustomerNotificationPreference(customerId: ID) {
  const _customerId: string = customerId;

  const [preference] = await sql<{
    id: number;
    customerId: string;
    preference: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "CustomerNotificationPreference"
    WHERE "customerId" = ${_customerId}
    LIMIT 1;
  `;

  if (!preference) {
    return null;
  }

  return preference.preference;
}

export async function upsertCustomerNotificationPreference(customerId: ID, preference: string) {
  const _customerId: string = customerId;

  await sql`
    INSERT INTO "CustomerNotificationPreference" ("customerId", preference)
    VALUES (${_customerId}, ${preference})
    ON CONFLICT ("customerId")
      DO UPDATE SET "preference" = EXCLUDED."preference";
  `;
}

export async function deleteCustomerNotificationPreference(customerId: ID) {
  const _customerId: string = customerId;

  await sql`
    DELETE
    FROM "CustomerNotificationPreference"
    WHERE "customerId" = ${_customerId};
  `;
}
