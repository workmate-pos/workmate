import { Fetch } from './fetch.js';
import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { FetchTaskResponse } from '@web/controllers/api/tasks.js';

export const useSyncProductMetafieldsTaskQuery = (
  { fetch }: { fetch: Fetch },
  options?: Partial<UseQueryOptions<FetchTaskResponse>>,
) =>
  useQuery({
    ...options,
    queryKey: ['sync-product-metafields-task'],
    queryFn: async () => {
      const response = await fetch('/api/tasks/sync/products');

      if (!response.ok) {
        throw new Error('Failed to get sync product metafields task');
      }

      const result: FetchTaskResponse = await response.json();
      return result;
    },
  });
