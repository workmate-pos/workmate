import { Fetch } from './fetch.js';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { match } from 'ts-pattern';
import { LineItemSourcesResponse } from '@web/controllers/api/sources.js';
import { zip } from '@teifi-digital/shopify-app-toolbox/iteration';

export const useLineItemSourcesQuery = ({ fetch, id }: { fetch: Fetch; id: ID }) =>
  useQuery({
    queryKey: ['sources', id],
    queryFn: createQueryFn(fetch, id),
  });

export const useLineItemSourceQueries = ({ fetch, ids }: { fetch: Fetch; ids: ID[] }) => {
  const queries = useQueries({
    queries: ids.map(id => ({
      queryKey: ['sources', id],
      queryFn: createQueryFn(fetch, id),
    })),
  });

  const sources: Record<ID, LineItemSourcesResponse['sources']> = {};

  for (const query of queries) {
    if (query.data) {
      sources[query.data.id] = query.data.sources;
    }
  }

  return {
    queries: Object.fromEntries(ids.map((id, i) => [id, queries[i]!])),
    sources,
  };
};

function createQueryFn(fetch: Fetch, id: ID) {
  return async () => {
    const { objectName, id: objectId } = parseGid(id);
    const type = match(objectName)
      .with('LineItem', () => 'line-item')
      .with('DraftOrderLineItem', () => 'draft-line-item')
      .otherwise(() => null);

    if (!type) {
      throw new Error(`Invalid line item type ${objectName}`);
    }

    const response = await fetch(`/api/sources/${type}/${encodeURIComponent(objectId)}`);
    const body: LineItemSourcesResponse = await response.json();
    return body;
  };
}
