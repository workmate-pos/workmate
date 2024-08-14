import { DetailedStockTransfer } from '@web/services/stock-transfers/types.js';
import { CreateStockTransfer } from '@web/schemas/generated/create-stock-transfer.js';

export function stockTransferToCreateStockTransfer(stockTransfer: DetailedStockTransfer): CreateStockTransfer {
  return {
    name: stockTransfer.name,
    lineItems: stockTransfer.lineItems.map<CreateStockTransfer['lineItems'][number]>(
      ({ inventoryItemId, uuid, status, productVariantTitle, productTitle, quantity, shopifyOrderLineItem }) => ({
        inventoryItemId,
        uuid,
        status,
        productVariantTitle,
        productTitle,
        quantity,
        shopifyOrderLineItem,
      }),
    ),
    note: stockTransfer.note,
    toLocationId: stockTransfer.toLocationId,
    fromLocationId: stockTransfer.fromLocationId,
  };
}
