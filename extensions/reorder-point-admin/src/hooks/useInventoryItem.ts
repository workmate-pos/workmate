import { skipToken, useQuery } from '@tanstack/react-query';
import { useApi } from '@shopify/ui-extensions-react/admin';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

const VARIANT_QUERY = `#graphql
  query getVariant($id: ID!) {
    productVariant(id: $id) {
      inventoryItem {
        id
      }
    }
  }
`;

type VariantQueryResponse = {
  productVariant: {
    inventoryItem: {
      id: ID;
    };
  } | null;
};

export function useInventoryItem(
  {
    query,
  }: ReturnType<typeof useApi<'admin.product-variant-details.block.render' | 'admin.product-details.block.render'>>,
  variantId: ID | undefined,
) {
  const { data, isLoading } = useQuery({
    queryKey: ['variant', variantId],
    queryFn: !variantId
      ? skipToken
      : async () => {
          const response = await query<VariantQueryResponse>(VARIANT_QUERY, { variables: { id: variantId } });
          return response?.data?.productVariant?.inventoryItem.id ?? null;
        },
    enabled: !!variantId,
  });

  return { inventoryItemId: data, isLoading };
}
