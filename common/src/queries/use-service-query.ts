import { Fetch } from './fetch.js';
import { useQuery } from 'react-query';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { GetServiceResponse } from '@web/controllers/api/services.js';

export const useServiceQuery = ({ fetch, id }: { fetch: Fetch; id: ID | null }) =>
  useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      if (id === null) {
        return null;
      }

      const response = await fetch(`/api/services/${encodeURIComponent(parseGid(id).id)}`);

      if (response.status >= 500 || response.status === 400) {
        throw new Error(`Failed to fetch service (${response.status})`);
      }

      const { service }: GetServiceResponse = await response.json();
      return service;
    },
  });
