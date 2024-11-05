import { useEffect, useState } from 'react';
import { useApi, AdminBlock, BlockStack, Button, Text, NumberField, Select } from '@shopify/ui-extensions-react/admin';
import { useReorderPointQuery } from '@work-orders/common/queries/use-reorder-point-query.js';
import { useReorderPointMutation } from '@work-orders/common/queries/use-reorder-point-mutation.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useInventoryItem } from '../hooks/useInventoryItem.js';
import { useLocationOptions } from '../hooks/useLocationOptions.js';

interface FormValues {
  min: number;
  max: number;
  locationId?: ID;
}

export function ReorderPointForm() {
  const { data } = useApi('admin.product-variant-details.block.render');
  const variantId = data.selected[0]?.id as ID;

  const { inventoryItemId, isLoading: isLoadingInventory } = useInventoryItem(variantId);
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
  } = useReorderPointQuery(
    {
      fetch,
      inventoryItemId: inventoryItemId!,
      locationId: formValues.locationId,
    },
    { enabled: !!inventoryItemId },
  );

  const mutation = useReorderPointMutation({ fetch });

  useEffect(() => {
    if (reorderPoint) {
      setFormValues({
        min: reorderPoint.min,
        max: reorderPoint.max,
        locationId: reorderPoint.locationId ?? undefined,
      });
    } else {
      setFormValues({
        min: 0,
        max: 0,
        locationId: undefined,
      });
    }
  }, [reorderPoint]);

  const handleSubmit = () => {
    if (!validateForm()) return;

    try {
      mutation.mutate({
        inventoryItemId: inventoryItemId!,
        locationId: formValues.locationId,
        min: formValues.min,
        max: formValues.max,
      });
    } catch (error) {
      console.error('Failed to save reorder point:', error);
    }
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
          disabled={mutation.isPending}
        />

        <NumberField
          label="Minimum Stock Level"
          value={formValues.min}
          onChange={(value: number | string) => setFormValues(prev => ({ ...prev, min: Number(value) }))}
          disabled={mutation.isPending}
        />

        <NumberField
          label="Maximum Stock Level"
          value={formValues.max}
          onChange={(value: number | string) => setFormValues(prev => ({ ...prev, max: Number(value) }))}
          disabled={mutation.isPending}
        />

        <Button onPress={handleSubmit} disabled={!validateForm() || mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>

        {mutation.isError && <Text>{extractErrorMessage(mutation.error, 'Failed to save reorder point')}</Text>}
      </BlockStack>
    </AdminBlock>
  );
}
