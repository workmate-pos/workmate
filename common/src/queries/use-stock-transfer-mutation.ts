import { useMutation, useQueryClient } from 'react-query';
import { CreateStockTransfer } from '@web/schemas/generated/create-stock-transfer.js';
import { CreateStockTransferResponse } from '@web/controllers/api/stock-transfers.js';
import { Fetch } from './fetch.js';
import { UseQueryData } from './react-query.js';
import { useStockTransferQuery } from './use-stock-transfer-query.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';

export const useStockTransferMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (createStockTransfer: CreateStockTransfer) => {
      const response = await fetch('/api/stock-transfers', {
        method: 'POST',
        body: JSON.stringify({
          ...createStockTransfer,
          lineItems: createStockTransfer.lineItems.map(lineItem => ({
            ...lineItem,
            shopifyOrderLineItem: lineItem.shopifyOrderLineItem
              ? pick(lineItem.shopifyOrderLineItem, 'id', 'orderId')
              : null,
          })),
        } satisfies CreateStockTransfer),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create stock transfer');
      }

      const body: CreateStockTransferResponse = await response.json();
      return body;
    },
    onSuccess(stockTransfer) {
      queryClient.invalidateQueries(['stock-transfer-page']);
      queryClient.invalidateQueries(['stock-transfer-count']);

      queryClient.setQueryData(
        ['stock-transfer', stockTransfer.name],
        stockTransfer satisfies UseQueryData<typeof useStockTransferQuery>,
      );
    },
  });
};
