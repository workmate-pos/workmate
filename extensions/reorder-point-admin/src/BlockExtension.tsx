import { useState, useEffect } from 'react';
import {
  reactExtension,
  useApi,
  AdminBlock,
  BlockStack,
  Button,
  Text,
  TextField,
  Select,
} from '@shopify/ui-extensions-react/admin';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReorderPointQuery } from '@work-orders/common/queries/use-reorder-point-query.js';
import { useReorderPointMutation } from '@work-orders/common/queries/use-reorder-point-mutation.js';
import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';

const TARGET = 'admin.product-details.block.render';

export default reactExtension(TARGET, () => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
});

function useLocationOptions() {
  const fetch = useAuthenticatedFetch();
  const locationsQuery = useLocationsQuery({
    fetch,
    params: {},
  });

  const options = [
    { label: 'Default (All Locations)', value: '' },
    ...(locationsQuery.data?.pages.flat() ?? []).map(location => ({
      label: location.name,
      value: location.id,
    })),
  ];

  return {
    options,
    isLoading: locationsQuery.isLoading,
    error: locationsQuery.error,
  };
}

function App() {
  const { data } = useApi(TARGET);
  const fetch = useAuthenticatedFetch();
  const productId = data.selected[0]?.id;

  const [selectedLocationId, setSelectedLocationId] = useState<ID | undefined>(undefined);
  const { options: locationOptions, isLoading: isLoadingLocations, error: locationError } = useLocationOptions();

  const { data: reorderPoints, isLoading } = useReorderPointQuery({
    fetch,
    inventoryItemId: productId as ID,
    locationId: selectedLocationId,
  });

  const mutation = useReorderPointMutation({ fetch });

  const [min, setMin] = useState<string>('');
  const [max, setMax] = useState<string>('');

  useEffect(() => {
    if (reorderPoints && reorderPoints[0]) {
      setMin(reorderPoints[0].min?.toString() ?? '');
      setMax(reorderPoints[0].max?.toString() ?? '');
    }
  }, [reorderPoints]);

  const handleSubmit = async () => {
    try {
      await mutation.mutateAsync({
        inventoryItemId: productId as ID,
        locationId: selectedLocationId,
        min: parseInt(min),
        max: parseInt(max),
      });
    } catch (error) {
      console.error('Failed to save reorder point:', error);
    }
  };

  if (!productId || isLoadingLocations) {
    return (
      <AdminBlock title="Configure Reorder Points">
        <BlockStack gap="base">
          <Text>Loading...</Text>
        </BlockStack>
      </AdminBlock>
    );
  }

  if (locationError) {
    return (
      <AdminBlock title="Configure Reorder Points">
        <BlockStack gap="base">
          <Text>{extractErrorMessage(locationError, 'Failed to load locations')}</Text>
        </BlockStack>
      </AdminBlock>
    );
  }

  return (
    <AdminBlock title="Configure Reorder Points">
      <BlockStack gap="base">
        <Select
          label="Location"
          value={selectedLocationId ?? ''}
          onChange={(value: ID) => setSelectedLocationId(value || undefined)}
          options={locationOptions}
        />

        <TextField label="Minimum Stock Level" value={min} onChange={(value: string) => setMin(value)} />

        <TextField label="Maximum Stock Level" value={max} onChange={(value: string) => setMax(value)} />

        <Button onPress={handleSubmit}>Save Configuration</Button>

        {mutation.isError && <Text>{extractErrorMessage(mutation.error, 'Failed to save reorder point')}</Text>}
      </BlockStack>
    </AdminBlock>
  );
}
