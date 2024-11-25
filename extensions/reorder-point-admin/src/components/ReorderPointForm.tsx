import { useEffect, useState } from 'react';
import {
  AdminBlock,
  BlockStack,
  Button,
  Text,
  NumberField,
  Select,
  InlineStack,
  useApi,
} from '@shopify/ui-extensions-react/admin';
import { useReorderPointQuery } from '@work-orders/common/queries/use-reorder-point-query.js';
import { useReorderPointMutation } from '@work-orders/common/queries/use-reorder-point-mutation.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useInventoryItem } from '../hooks/useInventoryItem.js';
import { useLocationOptions } from '../hooks/useLocationOptions.js';
import { useDeleteReorderPointMutation } from '@work-orders/common/queries/use-delete-reorder-point-mutation.js';

interface FormValues {
  min: number;
  max: number;
  locationId?: ID;
}

export function ReorderPointForm({
  api,
  productVariantId,
}: {
  api: ReturnType<typeof useApi<'admin.product-variant-details.block.render' | 'admin.product-details.block.render'>>;
  productVariantId: ID;
}) {
  const { inventoryItemId, isLoading: isLoadingInventory } = useInventoryItem(api, productVariantId);
  const { options: locationOptions, isLoading: isLoadingLocations, error: locationError } = useLocationOptions();

  const [formValues, setFormValues] = useState<FormValues>({
    min: 0,
    max: 0,
    locationId: undefined,
  });

  const {
    data: reorderPoint,
    isLoading: isLoadingReorderPoints,
    error: reorderPointError,
  } = useReorderPointQuery({
    fetch,
    inventoryItemId: inventoryItemId ?? null,
    locationId: formValues.locationId ?? null,
  });

  const reorderPointMutation = useReorderPointMutation({ fetch });
  const deleteReorderPointMutation = useDeleteReorderPointMutation({ fetch });

  useEffect(() => {
    if (reorderPoint) {
      setFormValues(current => ({
        ...current,
        min: reorderPoint.min,
        max: reorderPoint.max,
      }));
    } else {
      setFormValues(current => ({
        ...current,
        min: 0,
        max: 0,
      }));
    }
  }, [reorderPoint]);

  const handleSubmit = () => {
    if (!validateForm()) return;
    if (!inventoryItemId) return;

    deleteReorderPointMutation.reset();
    reorderPointMutation.mutate({
      inventoryItemId,
      locationId: formValues.locationId,
      min: formValues.min,
      max: formValues.max,
    });
  };

  const validateForm = (): boolean => {
    return formValues.min <= formValues.max;
  };

  if (!inventoryItemId || isLoadingInventory || isLoadingLocations || isLoadingReorderPoints) {
    return <Text>Loading...</Text>;
  }

  if (locationError) {
    return <Text>{extractErrorMessage(locationError, 'Failed to load locations')}</Text>;
  }

  if (reorderPointError) {
    return <Text>{extractErrorMessage(reorderPointError, 'Failed to load reorder point')}</Text>;
  }

  return (
    <AdminBlock title="Configure Reorder Points">
      <BlockStack gap="base">
        <Select
          label="Location"
          value={formValues.locationId ?? ''}
          onChange={(value: ID) => setFormValues(prev => ({ ...prev, locationId: value || undefined }))}
          options={locationOptions}
          disabled={reorderPointMutation.isPending}
        />

        <NumberField
          label="Minimum Stock Level"
          value={formValues.min}
          onChange={(value: number | string) => setFormValues(prev => ({ ...prev, min: Number(value) }))}
          disabled={reorderPointMutation.isPending}
        />

        <NumberField
          label="Maximum Stock Level"
          value={formValues.max}
          onChange={(value: number | string) => setFormValues(prev => ({ ...prev, max: Number(value) }))}
          disabled={reorderPointMutation.isPending}
        />

        <InlineStack gap="base">
          <Button
            onPress={handleSubmit}
            disabled={
              !validateForm() ||
              !inventoryItemId ||
              reorderPointMutation.isPending ||
              deleteReorderPointMutation.isPending
            }
          >
            {reorderPointMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button
            tone="critical"
            onPress={() => {
              if (!inventoryItemId) return;

              reorderPointMutation.reset();
              deleteReorderPointMutation.mutate({
                inventoryItemId: inventoryItemId,
                locationId: formValues.locationId ?? null,
              });
            }}
            disabled={
              !reorderPoint ||
              !inventoryItemId ||
              deleteReorderPointMutation.isPending ||
              reorderPointMutation.isPending
            }
          >
            {deleteReorderPointMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </InlineStack>

        {reorderPointMutation.isError && (
          <Text>{extractErrorMessage(reorderPointMutation.error, 'Failed to save reorder point')}</Text>
        )}
        {reorderPointMutation.isSuccess && <Text>Saved reorder point!</Text>}

        {deleteReorderPointMutation.isError && (
          <Text>{extractErrorMessage(deleteReorderPointMutation.error, 'Failed to delete reorder point')}</Text>
        )}
        {deleteReorderPointMutation.isSuccess && <Text>Deleted reorder point!</Text>}
      </BlockStack>
    </AdminBlock>
  );
}
