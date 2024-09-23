import { useQuery } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { FetchScannableMetafieldsResponse } from '@web/controllers/api/scan.js';

export const useScanVariantMetafieldsQuery = ({ fetch }: { fetch: Fetch }) =>
  useQuery({
    queryKey: ['scan-variant-metafields'],
    queryFn: async () => {
      const response = await fetch('/api/scan/variant-metafields');

      if (!response.ok) {
        throw new Error('Failed to fetch scan variant metafields');
      }

      const result: FetchScannableMetafieldsResponse = await response.json();
      return result;
    },
  });
