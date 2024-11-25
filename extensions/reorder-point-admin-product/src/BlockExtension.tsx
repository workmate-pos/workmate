import { useState } from 'react';
import { AdminBlock, reactExtension, Text, useApi } from '@shopify/ui-extensions-react/admin';
import { QueryClient, QueryClientProvider, skipToken, useQuery } from '@tanstack/react-query';
import { ReorderPointForm } from '@work-orders/reorder-point-admin';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export const TARGET = 'admin.product-details.block.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Form />
    </QueryClientProvider>
  );
}

function Form() {
  const api = useApi(TARGET);
  const productId = api.data.selected[0]?.id as ID;
  const productVariantId = useProductVariantId(productId).variantId;

  if (!productVariantId) {
    return (
      <AdminBlock>
        <Text>
          This product has multiple variants. Navigate to the individual variants to configure their reorder points
        </Text>
      </AdminBlock>
    );
  }

  return <ReorderPointForm api={api} productVariantId={productVariantId} />;
}

const PRODUCT_QUERY = `#graphql
  query getProduct($id: ID!) {
    product(id: $id) {
      variants(first: 2) {
        nodes {
          id
        }
      }
    }
  }
`;

type ProductQueryResponse = {
  product: {
    variants: {
      nodes: {
        id: ID;
      }[];
    };
  } | null;
};

/**
 * Grab the variant id if there is just one variant. Return nothing otherwise.
 */
function useProductVariantId(productId: ID | undefined) {
  const { query } = useApi(TARGET);

  const { data } = useQuery({
    queryKey: ['product-variant-ids', productId],
    queryFn: !productId
      ? skipToken
      : async () => {
          const response = await query<ProductQueryResponse>(PRODUCT_QUERY, { variables: { id: productId } });
          return response?.data?.product?.variants.nodes.map(variant => variant.id) ?? [];
        },
  });

  return { variantId: data?.length === 1 ? data[0]! : null };
}
