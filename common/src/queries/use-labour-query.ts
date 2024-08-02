import { Fetch } from './fetch.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useQueries, useQuery } from 'react-query';
import { FetchLabourResponse, GetLabourResponse } from '@web/controllers/api/labour.js';

async function fetchLabour(fetch: Fetch, id: ID) {
  const response = await fetch(`/api/labour/${encodeURIComponent(parseGid(id).id)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch labour (${response.status})`);
  }

  const { labour }: GetLabourResponse = await response.json();
  return labour;
}

export const useLabourQuery = ({ fetch, id }: { fetch: Fetch; id: ID | null }) =>
  useQuery({
    queryKey: ['labour', id],
    queryFn: async () => {
      if (id === null) {
        return null;
      }

      return await fetchLabour(fetch, id);
    },
  });

export const useLabourQueries = ({ fetch, ids }: { fetch: Fetch; ids: ID[] }) => {
  const queries = useQueries(
    ids.map(id => ({
      queryKey: ['labour', id],
      queryFn: async () => await fetchLabour(fetch, id),
    })),
  );
  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};

export type Labour = FetchLabourResponse['labour'][number];
