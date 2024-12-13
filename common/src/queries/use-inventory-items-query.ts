import type { FetchInventoryItemsResponse } from '@web/controllers/api/inventory-items.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { useQueryClient } from '@tanstack/react-query';
import { UseQueryData } from './react-query.js';
import { useInventoryItemQuery } from './use-inventory-item-query.js';
import { InventoryItemPaginationOptions } from '@web/schemas/generated/inventory-item-pagination-options.js';

const query = createPaginatedQuery({
  endpoint: '/api/inventory-items',
  queryKeyFn: (paginationOptions: InventoryItemPaginationOptions) => ['inventory-items', paginationOptions],
  extractPage: (response: FetchInventoryItemsResponse) => response.inventoryItems,
  cursorParamName: 'after',
});

export const useInventoryItemsQuery = (...[options, ...args]: Parameters<typeof query>) => {
  const queryClient = useQueryClient();

  return query(
    {
      ...options,
      options: {
        ...options.options,
        onSuccess: page => {
          for (const inventoryItem of page.inventoryItems) {
            queryClient.setQueryData(
              ['inventory-item', inventoryItem.inventoryLevel?.location.id, inventoryItem.id],
              inventoryItem satisfies UseQueryData<typeof useInventoryItemQuery>,
            );
          }

          options.options?.onSuccess?.(page);
        },
      },
    },
    ...args,
  );
};

export type InventoryItem = FetchInventoryItemsResponse['inventoryItems'][number];
