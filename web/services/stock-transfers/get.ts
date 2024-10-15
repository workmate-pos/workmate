import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { escapeLike } from '../db/like.js';
import { StockTransferPaginationOptions } from '../../schemas/generated/stock-transfer-pagination-options.js';
import { StockTransferCountOptions } from '../../schemas/generated/stock-transfer-count-options.js';
import { Int } from '../../schemas/generated/create-stock-transfer.js';
import { getStockTransfer, getStockTransferLineItems } from './queries.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getLineItemsById } from '../work-orders/get.js';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getPurchaseOrderLineItemsByIdAndUuid } from '../purchase-orders/queries.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';

export async function getDetailedStockTransfer(session: Session, name: string) {
  const stockTransfer = await getStockTransfer({ shop: session.shop, name });

  if (!stockTransfer) {
    throw new Error(`Stock transfer with name ${name} not found`);
  }

  const { note, fromLocationId, toLocationId } = stockTransfer;

  const lineItems = await getStockTransferLineItems(stockTransfer.id);

  const shopifyLineItemIds = unique(lineItems.map(item => item.shopifyOrderLineItemId).filter(isNonNullable));

  const [shopifyLineItemById, purchaseOrderLineItems] = await Promise.all([
    getLineItemsById(shopifyLineItemIds),
    getPurchaseOrderLineItemsByIdAndUuid(
      lineItems.filter(hasNonNullableProperty('purchaseOrderLineItemUuid')).map(item => ({
        purchaseOrderId: item.purchaseOrderId,
        uuid: item.purchaseOrderLineItemUuid,
      })),
    ),
  ]);

  return {
    name,
    fromLocationId,
    toLocationId,
    note,
    lineItems: lineItems.map(
      ({
        uuid,
        inventoryItemId,
        status,
        quantity,
        productTitle,
        productVariantTitle,
        shopifyOrderLineItemId,
        purchaseOrderLineItemUuid,
        purchaseOrderId,
      }) => {
        return {
          uuid,
          inventoryItemId,
          status,
          quantity: quantity as Int,
          productTitle,
          productVariantTitle,
          shopifyOrderLineItem: shopifyOrderLineItemId
            ? (shopifyLineItemById[shopifyOrderLineItemId] ?? never('fk'))
            : null,
          purchaseOrderLineItem: purchaseOrderLineItemUuid
            ? pick(
                purchaseOrderLineItems
                  .filter(hasPropertyValue('uuid', purchaseOrderLineItemUuid))
                  .find(hasPropertyValue('purchaseOrderId', purchaseOrderId)) ?? never('fk'),
                'purchaseOrderName',
                'uuid',
              )
            : null,
        };
      },
    ),
  };
}
export async function getStockTransferPage(session: Session, paginationOptions: StockTransferPaginationOptions) {
  if (paginationOptions.query !== undefined) {
    paginationOptions.query = `%${escapeLike(paginationOptions.query)}%`;
  }

  console.log(paginationOptions);

  const stockTransfers = await db.stockTransfers.getPage({
    shop: session.shop,
    limit: paginationOptions.limit,
    offset: paginationOptions.offset,
    status: paginationOptions.status,
    query: paginationOptions.query,
    fromLocationId: paginationOptions.fromLocationId
      ? createGid('Location', paginationOptions.fromLocationId)
      : undefined,
    toLocationId: paginationOptions.toLocationId ? createGid('Location', paginationOptions.toLocationId) : undefined,
  });

  return Promise.all(stockTransfers.map(({ name }) => getDetailedStockTransfer(session, name)));
}

export async function getStockTransferCount(session: Session, countOptions: StockTransferCountOptions) {
  if (countOptions.query !== undefined) {
    countOptions.query = `%${escapeLike(countOptions.query)}%`;
  }

  const [{ count } = { count: 0 }] = await db.stockTransfers.getCount({
    shop: session.shop,
    status: countOptions.status,
    query: countOptions.query,
    fromLocationId: countOptions.fromLocationId ? createGid('Location', countOptions.fromLocationId) : undefined,
    toLocationId: countOptions.toLocationId ? createGid('Location', countOptions.toLocationId) : undefined,
  });

  return count ?? 0;
}
