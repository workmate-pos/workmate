import { useState, useEffect } from 'react';
import { useApi } from '@shopify/ui-extensions-react/admin';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

const VARIANT_QUERY = `
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
      id: string;
    };
  };
}

export function useInventoryItem(variantId: ID | undefined) {
  const { query } = useApi('admin.product-variant-details.block.render');
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchInventoryItem() {
      if (!variantId) return;

      try {
        const response = await query<VariantQueryResponse>(VARIANT_QUERY, {
          variables: { id: variantId },
        });

        if (mounted && response?.data) {
          setInventoryItemId(encodeURIComponent(response.data.productVariant.inventoryItem.id));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchInventoryItem();

    return () => {
      mounted = false;
    };
  }, [variantId, query]);

  return { inventoryItemId, isLoading };
}
