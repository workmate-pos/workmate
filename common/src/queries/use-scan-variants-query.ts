import { skipToken, useQuery } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { ScanVariantResponse } from '@web/controllers/api/scan.js';

export const useScanVariantsQuery = ({ fetch, scanData }: { fetch: Fetch; scanData: string | undefined }) =>
  useQuery({
    queryKey: ['scan-variants', scanData],
    queryFn: !scanData
      ? skipToken
      : async () => {
          const response = await fetch(`/api/scan/variant/${encodeURIComponent(scanData)}`);

          if (!response.ok) {
            throw new Error('Failed to fetch scan variants');
          }

          const result: ScanVariantResponse = await response.json();
          return result.variants;
        },
  });
