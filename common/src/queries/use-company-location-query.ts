import { useQuery } from 'react-query';
import type { ID } from '@web/services/gql/queries/generated/schema.js';
import { FetchCompanyLocationResponse } from '@web/controllers/api/companies.js';
import { Fetch } from './fetch.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export const useCompanyLocationQuery = (
  { fetch, id }: { fetch: Fetch; id: ID | null },
  options?: { enabled?: boolean },
) => {
  return useQuery({
    ...options,
    queryKey: ['company-location', id] as const,
    queryFn: async () => {
      if (id === null) {
        return null;
      }

      const response = await fetch(`/api/companies/location/${encodeURIComponent(parseGid(id).id)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch companie location');
      }

      const results: FetchCompanyLocationResponse = await response.json();
      return results.location;
    },
  });
};
