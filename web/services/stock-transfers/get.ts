import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { assertGid, createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { escapeLike } from '../db/like.js';
import { StockTransferPaginationOptions } from '../../schemas/generated/stock-transfer-pagination-options.js';
import { StockTransferCountOptions } from '../../schemas/generated/stock-transfer-count-options.js';
import { Int } from '../../schemas/generated/create-stock-transfer.js';

export async function getStockTransfer(session: Session, name: string) {
  const [stockTransfer] = await db.stockTransfers.get({ shop: session.shop, name });

  if (!stockTransfer) {
    throw new Error(`Stock transfer with name ${name} not found`);
  }

  const { note, fromLocationId, toLocationId } = stockTransfer;

  assertGid(fromLocationId);
  assertGid(toLocationId);

  const lineItems = await db.stockTransfers.getLineItems({ stockTransferId: stockTransfer.id });

  return {
    name,
    fromLocationId,
    toLocationId,
    note,
    lineItems: lineItems.map(({ uuid, inventoryItemId, status, quantity, productTitle, productVariantTitle }) => {
      assertGid(inventoryItemId);

      return {
        uuid,
        inventoryItemId,
        status,
        quantity: quantity as Int,
        productTitle,
        productVariantTitle,
      };
    }),
  };
}
export async function getStockTransferPage(session: Session, paginationOptions: StockTransferPaginationOptions) {
  if (paginationOptions.query !== undefined) {
    paginationOptions.query = `%${escapeLike(paginationOptions.query)}%`;
  }

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

  return Promise.all(stockTransfers.map(({ name }) => getStockTransfer(session, name)));
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
