import { MergeUnion, UUID } from '../../util/types.js';
import { sql, sqlOne } from '../db/sql-tag.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertGidOrNull } from '../../util/assertions.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { assertMoney } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { SpecialOrderPaginationOptions } from '../../schemas/generated/special-order-pagination-options.js';

export type SpecialOrder = NonNullable<Awaited<ReturnType<typeof getSpecialOrder>>>;

export async function getSpecialOrder(filters: MergeUnion<{ id: number } | { shop: string; name: string }>) {
  const [specialOrder] = await sql<{
    id: number;
    shop: string;
    name: string;
    customerId: string;
    locationId: string;
    companyId: string | null;
    companyContactId: string | null;
    companyLocationId: string | null;
    requiredBy: Date | null;
    note: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "SpecialOrder"
    WHERE shop = COALESCE(${filters?.shop ?? null}, shop)
      AND name = COALESCE(${filters?.name ?? null}, name)
      AND id = COALESCE(${filters?.id ?? null}, id);`;

  if (!specialOrder) {
    return null;
  }

  return mapSpecialOrder(specialOrder);
}

function mapSpecialOrder(specialOrder: {
  id: number;
  shop: string;
  name: string;
  customerId: string;
  locationId: string;
  companyId: string | null;
  companyContactId: string | null;
  companyLocationId: string | null;
  requiredBy: Date | null;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { customerId, locationId, companyId, companyLocationId, companyContactId } = specialOrder;

  try {
    assertGid(customerId);
    assertGid(locationId);
    assertGidOrNull(companyId);
    assertGidOrNull(companyLocationId);
    assertGidOrNull(companyContactId);

    return {
      ...specialOrder,
      customerId,
      locationId,
      companyId,
      companyLocationId,
      companyContactId,
    };
  } catch (error) {
    sentryErr(error, { specialOrder });
    throw new HttpError('Unable to parse special order', 500);
  }
}

export async function getSpecialOrderLineItems(specialOrderId: number) {
  const lineItems = await sql<{
    id: number;
    specialOrderId: number;
    uuid: UUID;
    shopifyOrderLineItemId: string;
    productVariantId: string;
    quantity: number;
    purchaseOrderLineItems:
      | {
          purchaseOrderId: number;
          productVariantId: string;
          quantity: number;
          availableQuantity: number;
          unitCost: string;
          createdAt: Date;
          updatedAt: Date;
          uuid: UUID;
          specialOrderLineItemId: number | null;
        }[]
      | null;
  }>`
    SELECT spoli.*, jsonb_agg(poli) AS "purchaseOrderLineItems"
    FROM "SpecialOrderLineItem" spoli
           LEFT JOIN "PurchaseOrderLineItem" poli ON poli."specialOrderLineItemId" = spoli.id
    WHERE spoli."specialOrderId" = ${specialOrderId}
    GROUP BY spoli.id;
  `;

  return lineItems.map(mapSpecialOrderLineItem);
}

function mapSpecialOrderLineItem(lineItem: {
  id: number;
  specialOrderId: number;
  uuid: UUID;
  shopifyOrderLineItemId: string | null;
  productVariantId: string;
  quantity: number;
  purchaseOrderLineItems:
    | ({
        purchaseOrderId: number;
        productVariantId: string;
        quantity: number;
        availableQuantity: number;
        unitCost: string;
        createdAt: Date;
        updatedAt: Date;
        uuid: UUID;
        specialOrderLineItemId: number | null;
      } | null)[]
    | null;
}) {
  const { shopifyOrderLineItemId, productVariantId, purchaseOrderLineItems } = lineItem;

  try {
    assertGidOrNull(shopifyOrderLineItemId);
    assertGid(productVariantId);

    return {
      ...lineItem,
      shopifyOrderLineItemId,
      productVariantId,
      purchaseOrderLineItems:
        purchaseOrderLineItems?.filter(isNonNullable).map(
          ({ productVariantId, unitCost, ...lineItem }) => (
            assertGid(productVariantId),
            assertMoney(unitCost),
            {
              ...lineItem,
              productVariantId,
              unitCost,
              shopifyOrderLineItemId,
            }
          ),
        ) ?? [],
    };
  } catch (error) {
    sentryErr(error, { lineItem });
    throw new HttpError('Unable to parse special order line item', 500);
  }
}

export async function upsertSpecialOrder({
  shop,
  name,
  customerId,
  locationId,
  companyId,
  companyContactId,
  companyLocationId,
  requiredBy,
  note,
}: {
  shop: string;
  name: string;
  customerId: ID;
  locationId: ID;
  companyId: ID | null;
  companyContactId: ID | null;
  companyLocationId: ID | null;
  requiredBy: Date | null;
  note: string;
}) {
  const _customerId: string = customerId;
  const _locationId: string = locationId;
  const _companyId: string | null = companyId;
  const _companyContactId: string | null = companyContactId;
  const _companyLocationId: string | null = companyLocationId;

  return await sqlOne<{ id: number }>`
    INSERT INTO "SpecialOrder" (shop, name, "customerId", "locationId", "companyId", "companyContactId",
                                "companyLocationId", "requiredBy", note)
    VALUES (${shop},
            ${name},
            ${_customerId},
            ${_locationId},
            ${_companyId},
            ${_companyContactId},
            ${_companyLocationId},
            ${requiredBy!},
            ${note})
    ON CONFLICT (shop, name) DO UPDATE SET "customerId"        = EXCLUDED."customerId",
                                           "locationId"        = EXCLUDED."locationId",
                                           "companyId"         = EXCLUDED."companyId",
                                           "companyContactId"  = EXCLUDED."companyContactId",
                                           "companyLocationId" = EXCLUDED."companyLocationId",
                                           "requiredBy"        = EXCLUDED."requiredBy",
                                           note                = EXCLUDED.note
    RETURNING id;
  `;
}

export async function removeSpecialOrderLineItemsExceptUuids(specialOrderId: number, uuids: UUID[]) {
  await sql`
    DELETE
    FROM "SpecialOrderLineItem"
    WHERE "specialOrderId" = ${specialOrderId}
      AND uuid != ALL (${uuids} :: uuid[]);
  `;
}

export async function upsertSpecialOrderLineItems(
  specialOrderId: number,
  lineItems: {
    uuid: UUID;
    shopifyOrderLineItemId: ID;
    productVariantId: ID;
    quantity: number;
  }[],
) {
  if (!isNonEmptyArray(lineItems)) {
    return;
  }

  const { uuid, shopifyOrderLineItemId, productVariantId, quantity } = nest(lineItems);
  const _shopifyOrderLineItemId: (string | null)[] = shopifyOrderLineItemId;
  const _productVariantId: (string | null)[] = productVariantId;

  await sql`
    INSERT INTO "SpecialOrderLineItem" ("specialOrderId", uuid, "shopifyOrderLineItemId", "productVariantId", quantity)
    SELECT ${specialOrderId}, *
    FROM UNNEST(
      ${uuid} :: uuid[],
      ${_shopifyOrderLineItemId} :: text[],
      ${_productVariantId} :: text[],
      ${quantity} :: int[]
         );
  `;
}

export async function replaceSpecialOrderLineItemShopifyOrderLineItemIds(
  replacements: { currentShopifyOrderLineItemId: ID; newShopifyOrderLineItemId: ID }[],
) {
  if (!isNonEmptyArray(replacements)) {
    return;
  }

  const { currentShopifyOrderLineItemId, newShopifyOrderLineItemId } = nest(replacements);
  const _currentShopifyOrderLineItemId: (string | null)[] = currentShopifyOrderLineItemId;
  const _newShopifyOrderLineItemId: (string | null)[] = newShopifyOrderLineItemId;

  await sql`
    UPDATE "SpecialOrderLineItem" x
    SET "shopifyOrderLineItemId" = y."newShopifyOrderLineItemId"
    FROM UNNEST(
           ${_currentShopifyOrderLineItemId} :: text[],
           ${_newShopifyOrderLineItemId} :: text[]
         ) as y("currentShopifyOrderLineItemId", "newShopifyOrderLineItemId")
    WHERE x."shopifyOrderLineItemId" = y."currentShopifyOrderLineItemId";
  `;
}

export async function getSpecialOrdersPage(
  shop: string,
  { locationId, customerId, offset, query, lineItemVendorName, lineItemState, limit }: SpecialOrderPaginationOptions,
) {
  const _locationId: string | null = locationId ?? null;
  const _customerId: string | null = customerId ?? null;

  const specialOrders = await sql<{ id: number; name: string }>`
    SELECT DISTINCT so.id, so.name
    FROM "SpecialOrder" so
           LEFT JOIN "SpecialOrderLineItem" soli ON soli."specialOrderId" = so.id
           LEFT JOIN "ProductVariant" pv ON pv."productVariantId" = soli."productVariantId"
           LEFT JOIN "Product" p ON p."productId" = pv."productId"
    WHERE so.shop = ${shop}
      AND so."locationId" = COALESCE(${_locationId}, so."locationId")
      AND so."customerId" = COALESCE(${_customerId}, so."customerId")
      AND (so.note ILIKE COALESCE(${query ?? null}, '%'))
      AND p.vendor = COALESCE(${lineItemVendorName ?? null}, p.vendor)
      AND (
      CASE ${lineItemState ?? null}
        WHEN 'FULLY_ORDERED' THEN soli.quantity <= (SELECT SUM(poli.quantity)
                                                    FROM "PurchaseOrderLineItem" poli
                                                    WHERE poli."specialOrderLineItemId" = soli.id)
        WHEN 'NOT_FULLY_ORDERED' THEN soli.quantity > (SELECT SUM(poli.quantity)
                                                       FROM "PurchaseOrderLineItem" poli
                                                       WHERE poli."specialOrderLineItemId" = soli.id)
        ELSE TRUE
        END
      )
    ORDER BY so.id DESC
    LIMIT ${limit + 1} OFFSET ${offset}
  `;

  return {
    specialOrders: specialOrders.slice(0, -1),
    hasNextPage: specialOrders.length > limit,
  };
}

export async function getSpecialOrderLineItemsByShopifyOrderLineItemIds(shopifyOrderLineItemIds: ID[]) {
  if (!isNonEmptyArray(shopifyOrderLineItemIds)) {
    return [];
  }

  const _shopifyOrderLineItemIds: (string | null)[] = shopifyOrderLineItemIds;

  const lineItems = await sql<{
    id: number;
    specialOrderId: number;
    uuid: UUID;
    shopifyOrderLineItemId: string | null;
    productVariantId: string;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    purchaseOrderLineItems:
      | {
          purchaseOrderId: number;
          productVariantId: string;
          quantity: number;
          availableQuantity: number;
          unitCost: string;
          createdAt: Date;
          updatedAt: Date;
          uuid: UUID;
          specialOrderLineItemId: number | null;
        }[]
      | null;
  }>`
    SELECT soli.*, jsonb_agg(poli) AS "purchaseOrderLineItems"
    FROM "SpecialOrderLineItem" soli
           LEFT JOIN "PurchaseOrderLineItem" poli ON poli."specialOrderLineItemId" = soli.id
    WHERE "shopifyOrderLineItemId" = ANY (${_shopifyOrderLineItemIds})
    GROUP BY soli.id;
  `;

  return lineItems.map(mapSpecialOrderLineItem);
}

export async function getSpecialOrdersByNames(shop: string, names: string[]) {
  const specialOrders = await sql<{
    id: number;
    shop: string;
    name: string;
    customerId: string;
    locationId: string;
    companyId: string | null;
    companyContactId: string | null;
    companyLocationId: string | null;
    requiredBy: Date | null;
    note: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "SpecialOrder"
    WHERE shop = ${shop}
      AND name = ANY (${names} :: text[]);
  `;

  return specialOrders.map(mapSpecialOrder);
}

export async function getSpecialOrdersByIds(ids: number[]) {
  const specialOrders = await sql<{
    id: number;
    shop: string;
    name: string;
    customerId: string;
    locationId: string;
    companyId: string | null;
    companyContactId: string | null;
    companyLocationId: string | null;
    requiredBy: Date | null;
    note: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT DISTINCT so.*
    FROM "SpecialOrder" so
    WHERE so.id = ANY (${ids});
  `;

  return specialOrders.map(mapSpecialOrder);
}

export async function getSpecialOrderLineItemsForPurchaseOrder(purchaseOrderId: number) {
  const lineItems = await sql<{
    id: number;
    specialOrderId: number;
    uuid: UUID;
    shopifyOrderLineItemId: string | null;
    productVariantId: string;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    purchaseOrderLineItems:
      | {
          purchaseOrderId: number;
          productVariantId: string;
          quantity: number;
          availableQuantity: number;
          unitCost: string;
          createdAt: Date;
          updatedAt: Date;
          uuid: UUID;
          specialOrderLineItemId: number | null;
        }[]
      | null;
  }>`
    SELECT soli.*, jsonb_agg(poli) AS "purchaseOrderLineItems"
    FROM "SpecialOrderLineItem" soli
           INNER JOIN "PurchaseOrderLineItem" poli ON poli."specialOrderLineItemId" = soli.id
    WHERE poli."purchaseOrderId" = ${purchaseOrderId}
    GROUP BY soli.id;
  `;

  return lineItems.map(mapSpecialOrderLineItem);
}

export async function getSpecialOrderLineItemsByNameAndUuids(
  shop: string,
  idUuids: {
    name: string;
    uuid: UUID;
  }[],
) {
  if (!isNonEmptyArray(idUuids)) {
    return [];
  }

  const { name, uuid } = nest(idUuids);

  const lineItems = await sql<{
    id: number;
    specialOrderId: number;
    uuid: UUID;
    shopifyOrderLineItemId: string | null;
    productVariantId: string;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    purchaseOrderLineItems:
      | {
          purchaseOrderId: number;
          productVariantId: string;
          quantity: number;
          availableQuantity: number;
          unitCost: string;
          createdAt: Date;
          updatedAt: Date;
          uuid: UUID;
          specialOrderLineItemId: number | null;
        }[]
      | null;
  }>`
    SELECT soli.*, jsonb_agg(poli) AS "purchaseOrderLineItems"
    FROM "SpecialOrderLineItem" soli
           LEFT JOIN "PurchaseOrderLineItem" poli ON poli."specialOrderLineItemId" = soli.id
           INNER JOIN "SpecialOrder" so ON so.id = soli."specialOrderId"
    WHERE so.shop = ${shop}
      AND (so.name, soli.uuid) IN (SELECT *
                                   FROM UNNEST(
                                     ${name} :: text[],
                                     ${uuid} :: uuid[]
                                        ))
    GROUP BY soli.id;
  `;

  return lineItems.map(mapSpecialOrderLineItem);
}
