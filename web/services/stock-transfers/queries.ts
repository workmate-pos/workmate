import { sql, sqlOne } from '../db/sql-tag.js';
import { MergeUnion, UUID } from '../../util/types.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { assertGidOrNull } from '../../util/assertions.js';
import { StockTransferLineItemStatus } from '@prisma/client';
import { nest } from '../../util/db.js';
import { isNonEmptyArray, mapNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { unit } from '../db/unit-of-work.js';
import { getPurchaseOrderLineItemsByNameAndUuid } from '../purchase-orders/queries.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

export type StockTransfer = NonNullable<Awaited<ReturnType<typeof getStockTransfer>>>;
export type StockTransferLineItem = Awaited<ReturnType<typeof getStockTransferLineItems>>[number];

export async function getStockTransfer(filters: MergeUnion<{ id: number } | { shop: string; name: string }>) {
  const [stockTransfer] = await sql<{
    id: number;
    shop: string;
    name: string;
    fromLocationId: string;
    toLocationId: string;
    note: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "StockTransfer"
    WHERE shop = COALESCE(${filters?.shop ?? null}, shop)
      AND name = COALESCE(${filters?.name ?? null}, name)
      AND id = COALESCE(${filters?.id ?? null}, id);`;

  if (!stockTransfer) {
    return null;
  }

  return mapStockTransfer(stockTransfer);
}

export async function upsertStockTransfer({
  shop,
  name,
  fromLocationId,
  toLocationId,
  note,
}: {
  shop: string;
  name: string;
  fromLocationId: ID;
  toLocationId: ID;
  note: string;
}) {
  const _fromLocationId: string = fromLocationId;
  const _toLocationId: string = toLocationId;

  const stockTransfer = await sqlOne<{
    id: number;
    shop: string;
    name: string;
    fromLocationId: string;
    toLocationId: string;
    note: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    INSERT INTO "StockTransfer" (shop, name, "fromLocationId", "toLocationId", note)
    VALUES (${shop}, ${name}, ${_fromLocationId}, ${_toLocationId}, ${note})
    ON CONFLICT ("shop", "name")
      DO UPDATE SET "fromLocationId" = EXCLUDED."fromLocationId",
                    "toLocationId"   = EXCLUDED."toLocationId",
                    note             = EXCLUDED.note
    RETURNING *;`;

  return mapStockTransfer(stockTransfer);
}

function mapStockTransfer(stockTransfer: {
  id: number;
  shop: string;
  name: string;
  fromLocationId: string;
  toLocationId: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { fromLocationId, toLocationId } = stockTransfer;

  try {
    assertGid(fromLocationId);
    assertGid(toLocationId);

    return {
      ...stockTransfer,
      fromLocationId,
      toLocationId,
    };
  } catch (error) {
    sentryErr(error, { stockTransfer });
    throw new HttpError('Unable to parse stock transfer', 500);
  }
}

export async function getStockTransferLineItems(stockTransferId: number) {
  const lineItems = await sql<{
    uuid: string;
    stockTransferId: number;
    inventoryItemId: string;
    productTitle: string;
    productVariantTitle: string;
    status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    shopifyOrderLineItemId: string | null;
    shopifyOrderId: string | null;
    purchaseOrderId: number | null;
    purchaseOrderLineItemUuid: string | null;
  }>`
    SELECT *
    FROM "StockTransferLineItem"
    WHERE "stockTransferId" = ${stockTransferId};`;

  return lineItems.map(mapStockTransferLineItem);
}

function mapStockTransferLineItem(stockTransferLineItem: {
  uuid: string;
  stockTransferId: number;
  inventoryItemId: string;
  productTitle: string;
  productVariantTitle: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  shopifyOrderLineItemId: string | null;
  shopifyOrderId: string | null;
  purchaseOrderId: number | null;
  purchaseOrderLineItemUuid: string | null;
}) {
  const { uuid, inventoryItemId, shopifyOrderLineItemId, shopifyOrderId, purchaseOrderLineItemUuid, purchaseOrderId } =
    stockTransferLineItem;

  const getShopifyOrderLineItemDetails = () => {
    if (shopifyOrderId !== null && shopifyOrderLineItemId !== null) {
      assertGid(shopifyOrderId);
      assertGid(shopifyOrderLineItemId);

      return {
        shopifyOrderLineItemId,
        shopifyOrderId,
      };
    }

    if (shopifyOrderId === null && shopifyOrderLineItemId === null) {
      return {
        shopifyOrderLineItemId,
        shopifyOrderId,
      };
    }

    throw new Error(`shopifyOrderId and shopifyOrderLineItemId must be both null or both set`);
  };

  const getPurchaseOrderLineItemDetails = () => {
    if (purchaseOrderId !== null && purchaseOrderLineItemUuid !== null) {
      return {
        purchaseOrderId,
        purchaseOrderLineItemUuid: purchaseOrderLineItemUuid as UUID,
      };
    }

    if (purchaseOrderId === null && purchaseOrderLineItemUuid === null) {
      return {
        purchaseOrderId,
        purchaseOrderLineItemUuid,
      };
    }

    throw new Error(`purchaseOrderId and purchaseOrderLineItemUuid must be both null or both set`);
  };

  try {
    assertGid(inventoryItemId);

    return {
      ...stockTransferLineItem,
      uuid: uuid as UUID,
      inventoryItemId,
      ...getShopifyOrderLineItemDetails(),
      ...getPurchaseOrderLineItemDetails(),
    };
  } catch (error) {
    sentryErr(error, { stockTransferLineItems: stockTransferLineItem });
    throw new HttpError('Unable to parse stock transfer line item', 500);
  }
}

export async function upsertStockTransferLineItems(
  stockTransferId: number,
  items: {
    uuid: string;
    inventoryItemId: ID;
    productTitle: string;
    productVariantTitle: string;
    status: StockTransferLineItemStatus;
    quantity: number;
    shopifyOrderLineItem: {
      id: ID;
      orderId: ID;
    } | null;
    purchaseOrderLineItem: {
      purchaseOrderName: string;
      uuid: UUID;
    } | null;
  }[],
) {
  if (!isNonEmptyArray(items)) {
    return;
  }

  const { uuid, inventoryItemId, productTitle, productVariantTitle, status, quantity } = nest(items);
  const { id: shopifyOrderLineItemId, orderId: shopifyOrderId } = nest(
    mapNonEmptyArray(items, item => item.shopifyOrderLineItem ?? { id: null, orderId: null }),
  );

  const _inventoryItemIds: string[] = inventoryItemId;
  const _shopifyOrderLineItemIds: (string | null)[] = shopifyOrderLineItemId;
  const _shopifyOrderIds: (string | null)[] = shopifyOrderId;

  return await unit(async () => {
    const purchaseOrderLineItems = await getPurchaseOrderLineItemsByNameAndUuid(
      items.map(item => item.purchaseOrderLineItem).filter(isNonNullable),
    );

    const linkedPurchaseOrderLineItems = items.map(purchaseOrderLineItem => {
      if (!purchaseOrderLineItem.purchaseOrderLineItem) {
        return { purchaseOrderId: null, purchaseOrderLineItemUuid: null };
      }

      const linkedPurchaseOrderLineItem = purchaseOrderLineItems
        .filter(hasPropertyValue('uuid', purchaseOrderLineItem.purchaseOrderLineItem.uuid))
        .find(hasPropertyValue('purchaseOrderName', purchaseOrderLineItem.purchaseOrderLineItem.purchaseOrderName));

      if (!linkedPurchaseOrderLineItem) {
        throw new HttpError(`Could not find linked purchase order line item`, 400);
      }

      return {
        purchaseOrderId: linkedPurchaseOrderLineItem.purchaseOrderId,
        purchaseOrderLineItemUuid: linkedPurchaseOrderLineItem.uuid,
      };
    });

    if (!isNonEmptyArray(linkedPurchaseOrderLineItems)) {
      never('If items is non-empty, then linked purchase order line items must also be non-empty');
    }

    const { purchaseOrderId, purchaseOrderLineItemUuid } = nest(linkedPurchaseOrderLineItems);
    const _purchaseOrderId: (number | null)[] = purchaseOrderId;
    const _purchaseOrderLineItemUuid: (string | null)[] = purchaseOrderLineItemUuid;

    await sql`
      INSERT INTO "StockTransferLineItem" ("stockTransferId", uuid, "inventoryItemId", "productTitle",
                                           "productVariantTitle", status, quantity, "shopifyOrderLineItemId",
                                           "shopifyOrderId", "purchaseOrderId", "purchaseOrderLineItemUuid")
      SELECT ${stockTransferId}, *
      FROM UNNEST(
        ${uuid} :: uuid[],
        ${_inventoryItemIds} :: text[],
        ${productTitle} :: text[],
        ${productVariantTitle} :: text[],
        ${status} :: "StockTransferLineItemStatus"[],
        ${quantity} :: int[],
        ${_shopifyOrderLineItemIds} :: text[],
        ${_shopifyOrderIds} :: text[],
        ${_purchaseOrderId} :: int[],
        ${_purchaseOrderLineItemUuid} :: uuid[]
           );`;
  });
}

export async function removeStockTransferLineItems(stockTransferId: number) {
  await sql`
    DELETE
    FROM "StockTransferLineItem"
    WHERE "stockTransferId" = ${stockTransferId};`;
}

export async function replaceStockTransferLineItemShopifyOrderLineItemIds(
  replacements: { currentShopifyOrderLineItemId: ID; newShopifyOrderLineItemId: ID }[],
) {
  if (!isNonEmptyArray(replacements)) {
    return;
  }

  const { currentShopifyOrderLineItemId, newShopifyOrderLineItemId } = nest(replacements);
  const _currentShopifyOrderLineItemId: (string | null)[] = currentShopifyOrderLineItemId;
  const _newShopifyOrderLineItemId: (string | null)[] = newShopifyOrderLineItemId;

  await sql`
    UPDATE "StockTransferLineItem" x
    SET "shopifyOrderLineItemId" = y."newShopifyOrderLineItemId"
    FROM UNNEST(
           ${_currentShopifyOrderLineItemId} :: text[],
           ${_newShopifyOrderLineItemId} :: text[]
         ) as y("currentShopifyOrderLineItemId", "newShopifyOrderLineItemId")
    WHERE x."shopifyOrderLineItemId" = y."currentShopifyOrderLineItemId";`;
}

export async function getTransferOrderLineItemsByShopifyOrderLineItemIds(shopifyOrderLineItemIds: ID[]) {
  if (!isNonEmptyArray(shopifyOrderLineItemIds)) {
    return [];
  }

  const _shopifyOrderLineItemIds: (string | null)[] = shopifyOrderLineItemIds;

  const lineItems = await sql<{
    uuid: string;
    stockTransferId: number;
    inventoryItemId: string;
    productTitle: string;
    productVariantTitle: string;
    status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    shopifyOrderLineItemId: string | null;
    shopifyOrderId: string | null;
    purchaseOrderId: number | null;
    purchaseOrderLineItemUuid: string | null;
  }>`
    SELECT *
    FROM "StockTransferLineItem"
    WHERE "shopifyOrderLineItemId" = ANY (${_shopifyOrderLineItemIds});`;

  return lineItems.map(mapStockTransferLineItem);
}

export async function getStockTransfersByIds(stockTransferIds: number[]) {
  const stockTransfers = await sql<{
    id: number;
    shop: string;
    name: string;
    fromLocationId: string;
    toLocationId: string;
    note: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "StockTransfer"
    WHERE id = ANY (${stockTransferIds});`;

  return stockTransfers.map(mapStockTransfer);
}
