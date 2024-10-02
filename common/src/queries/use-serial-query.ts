import { Fetch } from './fetch.js';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { FetchSerialResponse } from '@web/controllers/api/serials.js';
import { DetailedSerial } from '@web/services/serials/get.js';

export const useSerialQuery = (
  {
    fetch,
    serial,
    productVariantId,
  }: {
    fetch: Fetch;
    productVariantId: ID | null;
    serial: string | null;
  },
  options?: Partial<UseQueryOptions<DetailedSerial | null, unknown, DetailedSerial | null, (string | null)[]>>,
) =>
  useQuery({
    ...options,
    queryKey: ['serial', productVariantId, serial],
    queryFn: async () => {
      if (!productVariantId || !serial) {
        return null;
      }

      const response = await fetch(
        `/api/serials/${encodeURIComponent(parseGid(productVariantId).id)}/${encodeURIComponent(serial)}`,
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch serial');
      }

      const res: FetchSerialResponse = await response.json();
      return res;
    },
  });
