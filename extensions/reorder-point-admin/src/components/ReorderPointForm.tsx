import { useEffect, useState } from 'react';
import { useApi, AdminBlock, BlockStack, Button, Text, TextField, Select } from '@shopify/ui-extensions-react/admin';
import { useReorderPointQuery } from '@work-orders/common/queries/use-reorder-point-query.js';
import { useReorderPointMutation } from '@work-orders/common/queries/use-reorder-point-mutation.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useInventoryItem } from '../hooks/useInventoryItem.js';
import { useLocationOptions } from '../hooks/useLocationOptions.js';

interface FormValues {
  min: string;
  max: string;
  locationId?: ID;
}

export function ReorderPointForm() {
  const { data } = useApi('admin.product-variant-details.block.render');
  const variantId = data.selected[0]?.id as ID;

  const { inventoryItemId, isLoading: isLoadingInventory } = useInventoryItem(variantId);
  const { options: locationOptions, isLoading: isLoadingLocations, error: locationError } = useLocationOptions();

  const [formValues, setFormValues] = useState<FormValues>({
    min: '',
    max: '',
    locationId: undefined,
  });

  const { data: reorderPoints } = useReorderPointQuery(
    {
      fetch,
      inventoryItemId: inventoryItemId as ID,
      locationId: formValues.locationId,
    },
    { enabled: !!inventoryItemId },
  );

  const mutation = useReorderPointMutation({ fetch });

  useEffect(() => {
    const point = reorderPoints?.[0];
    if (point) {
      setFormValues(prev => ({
        ...prev,
        min: point.min?.toString() ?? '',
        max: point.max?.toString() ?? '',
      }));
    }
  }, [reorderPoints]);

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await mutation.mutateAsync({
        inventoryItemId: inventoryItemId as ID,
        locationId: formValues.locationId,
        min: parseInt(formValues.min),
        max: parseInt(formValues.max),
      });
    } catch (error) {
      console.error('Failed to save reorder point:', error);
    }
  };

  const validateForm = (): boolean => {
    const min = parseInt(formValues.min);
    const max = parseInt(formValues.max);
    return !isNaN(min) && !isNaN(max) && min <= max;
  };

  if (!inventoryItemId || isLoadingInventory || isLoadingLocations) {
    return <Text>Loading...</Text>;
  }

  if (locationError) {
    return <Text>{extractErrorMessage(locationError, 'Failed to load locations')}</Text>;
  }

  return (
    <AdminBlock title="Configure Reorder Points">
      <BlockStack gap="base">
        <Select
          label="Location"
          value={formValues.locationId ?? ''}
          onChange={(value: ID) => setFormValues(prev => ({ ...prev, locationId: value || undefined }))}
          options={locationOptions}
        />

        <TextField
          label="Minimum Stock Level"
          value={formValues.min}
          onChange={(value: string) => setFormValues(prev => ({ ...prev, min: value }))}
        />

        <TextField
          label="Maximum Stock Level"
          value={formValues.max}
          onChange={(value: string) => setFormValues(prev => ({ ...prev, max: value }))}
        />

        <Button onPress={handleSubmit} disabled={!validateForm()}>
          Save Configuration
        </Button>

        {mutation.isError && <Text>{extractErrorMessage(mutation.error, 'Failed to save reorder point')}</Text>}
      </BlockStack>
    </AdminBlock>
  );
}
