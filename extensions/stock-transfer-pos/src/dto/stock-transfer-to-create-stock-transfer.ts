import { StockTransfer } from '@web/services/stock-transfers/types.js';
import { CreateStockTransfer } from '@web/schemas/generated/create-stock-transfer.js';

export function stockTransferToCreateStockTransfer(stockTransfer: StockTransfer): CreateStockTransfer {
  return {
    name: stockTransfer.name,
    lineItems: stockTransfer.lineItems.map<CreateStockTransfer['lineItems'][number]>(
      ({ inventoryItemId, uuid, status, productVariantTitle, productTitle, quantity }) => ({
        inventoryItemId,
        uuid,
        status,
        productVariantTitle,
        productTitle,
        quantity,
      }),
    ),
    note: stockTransfer.note,
    toLocationId: stockTransfer.toLocationId,
    fromLocationId: stockTransfer.fromLocationId,
  };
}
