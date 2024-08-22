import { DetailedStockTransfer } from '@web/services/stock-transfers/types.js';
import { CreateStockTransfer } from '@web/schemas/generated/create-stock-transfer.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';

export function stockTransferToCreateStockTransfer(stockTransfer: DetailedStockTransfer): CreateStockTransfer {
  return {
    name: stockTransfer.name,
    lineItems: stockTransfer.lineItems.map<CreateStockTransfer['lineItems'][number]>(
      ({
        inventoryItemId,
        uuid,
        status,
        productVariantTitle,
        productTitle,
        quantity,
        shopifyOrderLineItem,
        purchaseOrderLineItem,
      }) => ({
        inventoryItemId,
        uuid,
        status,
        productVariantTitle,
        productTitle,
        quantity,
        shopifyOrderLineItem: shopifyOrderLineItem ? pick(shopifyOrderLineItem, 'id', 'orderId') : null,
        purchaseOrderLineItem: purchaseOrderLineItem ? pick(purchaseOrderLineItem, 'purchaseOrderName', 'uuid') : null,
      }),
    ),
    note: stockTransfer.note,
    toLocationId: stockTransfer.toLocationId,
    fromLocationId: stockTransfer.fromLocationId,
  };
}
