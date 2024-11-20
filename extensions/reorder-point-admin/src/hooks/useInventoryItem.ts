import { useQuery } from '@tanstack/react-query';
import { useApi } from '@shopify/ui-extensions-react/admin';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { TARGET } from '../BlockExtension.js';

const VARIANT_QUERY = `#graphql
  query getVariant($id: ID!) {
    productVariant(id: $id) {
      inventoryItem {
        id
      }
    }
  }
`;

interface VariantQueryResponse {
  productVariant: {
    inventoryItem: {
      id: ID;
    };
  };
}

export function useInventoryItem(variantId: ID | undefined) {
  const { query } = useApi(TARGET);

  const { data, isLoading } = useQuery({
    queryKey: ['variant', variantId],
    queryFn: async () => {
      if (!variantId) return null;
      const response = await query<VariantQueryResponse>(VARIANT_QUERY, {
        variables: { id: variantId },
      });
      return response?.data?.productVariant.inventoryItem.id ?? null;
    },
    enabled: !!variantId,
  });

  return { inventoryItemId: data, isLoading };
}
