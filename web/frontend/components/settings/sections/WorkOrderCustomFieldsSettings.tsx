import { BlockStack } from '@shopify/polaris';
import { WorkOrderCustomFieldsCard } from '@web/frontend/components/work-orders/WorkOrderCustomFieldsCard.js';
import { CustomFieldsCard } from '@web/frontend/components/shared-orders/CustomFieldsCard.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';

export function WorkOrderCustomFieldsSettings() {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [];

  return (
    <BlockStack gap="400">
      <CustomFieldsCard
        customFields={createWorkOrder.customFields}
        onUpdate={(customFields: Record<string, string>) => dispatch.setPartial({ customFields })}
        disabled={disabled}
        onImportPresetClick={onImportPresetClick}
        onSavePresetClick={onSavePresetClick}
        onEditPresetClick={onEditPresetClick}
        onAddCustomFieldClick={onAddCustomFieldClick}
      />

      {toast}
    </BlockStack>
  );
}
