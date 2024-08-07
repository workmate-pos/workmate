import { BlockStack, Button } from '@shopify/polaris';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useState } from 'react';
import { CustomFieldPresetsModal } from '@web/frontend/components/shared-orders/modals/CustomFieldPresetsModal.js';
import { CustomFieldValuesSelectorModal } from '@web/frontend/components/shared-orders/modals/CustomFieldValuesSelectorModal.js';
import { useAllCustomFieldValueOptionsQuery } from '@work-orders/common/queries/use-all-custom-field-value-options-query.js';
import { EditCustomFieldPresetModal } from '@web/frontend/components/shared-orders/modals/EditCustomFieldPresetModal.js';
import { CustomFieldsPresetType } from '@web/controllers/api/custom-fields-presets.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

/**
 * Custom field settings section.
 * If a custom field type is provided, it will show presets for that type only.
 * If not, all types will be shown.
 */
export function CustomFieldSettings({ type }: { type?: CustomFieldsPresetType }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const types: CustomFieldsPresetType[] = type ? [type] : ['WORK_ORDER', 'PURCHASE_ORDER', 'LINE_ITEM'];

  const [presetsModalType, setPresetsModalType] = useState<CustomFieldsPresetType>();
  const [editPresetName, setEditPresetName] = useState<string>();

  const [isFieldValuesModalOpen, setIsFieldValuesModalOpen] = useState(false);

  const customFieldValueOptionsQuery = useAllCustomFieldValueOptionsQuery({ fetch });
  const customFieldNames =
    customFieldValueOptionsQuery.data?.filter(field => field.options.length > 0).map(field => field.name) ?? [];

  return (
    <BlockStack gap="400">
      {types.map(type => (
        <Button key={type} onClick={() => setPresetsModalType(type)}>
          Custom Field Presets ({titleCase(type)})
        </Button>
      ))}

      <Button
        onClick={() => setIsFieldValuesModalOpen(true)}
        loading={customFieldValueOptionsQuery.isLoading}
        disabled={!customFieldValueOptionsQuery.data}
      >
        Custom Field Values
      </Button>

      {!!presetsModalType && (
        <CustomFieldPresetsModal
          type={presetsModalType}
          open={!!presetsModalType && !editPresetName}
          onClose={() => setPresetsModalType(undefined)}
          onEdit={presetName => setEditPresetName(presetName)}
          setToastAction={setToastAction}
        />
      )}

      {!!presetsModalType && !!editPresetName && (
        <EditCustomFieldPresetModal
          open={!!editPresetName}
          onClose={() => setEditPresetName(undefined)}
          setToastAction={setToastAction}
          name={editPresetName}
          type={presetsModalType}
        />
      )}

      {isFieldValuesModalOpen && (
        <CustomFieldValuesSelectorModal
          names={customFieldNames}
          open={isFieldValuesModalOpen}
          onClose={() => setIsFieldValuesModalOpen(false)}
          allowCreateNew
        />
      )}

      {toast}
    </BlockStack>
  );
}
