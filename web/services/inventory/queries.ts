import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql } from '../db/sql-tag.js';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';

export async function upsertInventoryQuantities(
  shop: string,
  items: {
    inventoryItemId: ID;
    locationId: ID;
    name: string;
    quantity: number;
  }[],
) {
  if (!isNonEmptyArray(items)) {
    return;
  }

  const { inventoryItemId, locationId, name, quantity } = nest(items);

  const _inventoryItemId: string[] = inventoryItemId;
  const _locationId: string[] = locationId;

  await sql`
    INSERT INTO "InventoryQuantity" (shop, "inventoryItemId", "locationId", name, quantity)
    SELECT ${shop}, *
    FROM UNNEST(
      ${_inventoryItemId} :: text[],
      ${_locationId} :: text[],
      ${name} :: text[],
      ${quantity} :: int[]
         )
    ON CONFLICT ("shop", "locationId", "inventoryItemId", name) DO UPDATE
      SET "quantity" = EXCLUDED.quantity;
  `;
}
