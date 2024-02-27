import type { FetchInventoryItemsResponse } from '@web/controllers/api/inventory-items.js';
import type { PaginationOptions } from '@web/schemas/generated/pagination-options.js';
import { createPaginatedQuery } from './create-paginated-query.js';
import { useQueryClient } from 'react-query';
import { UseQueryData } from './react-query.js';
import { useInventoryItemQuery } from './use-inventory-item-query.js';

const query = createPaginatedQuery({
  endpoint: '/api/inventory-items',
  queryKeyFn: ({ query }: PaginationOptions) => ['inventory-items', query],
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
        onSuccess: data => {
          for (const inventoryItem of data.pages.flat()) {
            queryClient.setQueryData(
              ['inventory-item', inventoryItem.id],
              inventoryItem satisfies UseQueryData<typeof useInventoryItemQuery>,
            );
          }

          options.options?.onSuccess?.(data);
        },
      },
    },
    ...args,
  );
};

export type InventoryItem = FetchInventoryItemsResponse['inventoryItems'][number];
