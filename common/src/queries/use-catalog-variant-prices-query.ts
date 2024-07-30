import { useQueries, useQuery } from 'react-query';
import { Fetch } from './fetch.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { FetchCatalogPricesResponse } from '@web/controllers/api/catalogs.js';
import { useBatcher } from '../batcher/use-batcher.js';

const useCatalogVariantPricesBatcher = (fetch: Fetch, catalogIds: ID[]) =>
  useBatcher({
    key: `catalog-variant-prices-${catalogIds.join(',')}`,
    maxSize: 50,
    handler: async (productVariantIds: ID[]) => {
      if (productVariantIds.length === 0 || catalogIds.length === 0) {
        return [];
      }

      const searchParams = new URLSearchParams();

      for (const id of catalogIds) {
        const gid = parseGid(id);
        searchParams.append('catalogTypes', gid.objectName);
        searchParams.append('catalogIds', gid.id);
      }

      for (const id of productVariantIds) {
        searchParams.append('productVariantIds', parseGid(id).id);
      }

      const response = await fetch(`/api/catalogs/prices?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch catalog prices');
      }

      const { prices }: FetchCatalogPricesResponse = await response.json();

      return productVariantIds.map(id => prices[id] ?? null);
    },
  });

export const useCatalogVariantPricesQuery = ({
  fetch,
  catalogIds,
  productVariantId,
}: {
  fetch: Fetch;
  catalogIds: ID[];
  productVariantId: ID;
}) => {
  const batcher = useCatalogVariantPricesBatcher(fetch, catalogIds);
  return useQuery({
    queryKey: ['catalog-variant-price', catalogIds, productVariantId],
    queryFn: async () => {
      return await batcher.fetch(productVariantId);
    },
  });
};

export const useCatalogVariantPricesQueries = ({
  fetch,
  catalogIds,
  productVariantIds,
}: {
  fetch: Fetch;
  catalogIds: ID[];
  productVariantIds: ID[];
}) => {
  const batcher = useCatalogVariantPricesBatcher(fetch, catalogIds);
  const queries = useQueries(
    productVariantIds.map(id => ({
      queryKey: ['catalog-variant-price', catalogIds, id],
      queryFn: async () => {
        return await batcher.fetch(id);
      },
    })),
  );
  return Object.fromEntries(productVariantIds.map((id, i) => [id, queries[i]!]));
};
