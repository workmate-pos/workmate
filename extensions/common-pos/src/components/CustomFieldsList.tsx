import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { Route, UseRouter } from '@work-orders/common-pos/screens/router.js';
import { CustomFieldConfigProps } from '@work-orders/common-pos/screens/custom-fields/CustomFieldConfig.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { SavePresetProps } from '@work-orders/common-pos/screens/custom-fields/SavePreset.js';
import { SelectPresetToEditProps } from '../screens/custom-fields/SelectPresetToEdit.js';
import { EditPresetProps } from '../screens/custom-fields/EditPreset.js';
import { SelectPresetProps } from '../screens/custom-fields/SelectPreset.js';
import { CustomFieldValuesConfigProps } from '../screens/custom-fields/CustomFieldValuesConfig.js';
import { ListPopupProps } from '../screens/ListPopup.js';

/**
 * A list of custom fields with the option to add new ones.
 */
export function CustomFieldsList({
  useRouter,
  customFields,
  onSave,
  type,
}: {
  useRouter: UseRouter<{
    CustomFieldConfig: Route<CustomFieldConfigProps>;
    SavePreset: Route<SavePresetProps>;
    EditPreset: Route<EditPresetProps>;
    SelectPresetToEdit: Route<SelectPresetToEditProps>;
    SelectPreset: Route<SelectPresetProps>;
    ListPopup: Route<ListPopupProps>;
    CustomFieldValuesConfig: Route<CustomFieldValuesConfigProps>;
  }>;
  customFields: Record<string, string>;
  onSave: (customFields: Record<string, string>) => void;
  type: CustomFieldConfigProps['type'];
}) {
  const router = useRouter();

  return (
    <ResponsiveGrid columns={4}>
      {Object.entries(customFields).map(([key, value]) => (
        <FormStringField
          key={key}
          label={key}
          value={value}
          onChange={(value: string) => {
            const newCustomFields = { ...customFields };
            newCustomFields[key] = value;
            onSave(newCustomFields);
          }}
        />
      ))}

      <FormButton
        title={'Configure custom fields'}
        onPress={() =>
          router.push('CustomFieldConfig', {
            initialCustomFields: customFields,
            onSave,
            useRouter,
            type,
          })
        }
      />
    </ResponsiveGrid>
  );
}
