import { Route, UseRouter } from '../router.js';
import { CustomFieldsPresetType } from '@web/controllers/api/custom-fields-presets.js';
import { SelectPreset } from './SelectPreset.js';
import { EditPresetProps } from './EditPreset.js';

export type SelectPresetToEditProps = {
  useRouter: UseRouter<{
    EditPreset: Route<EditPresetProps>;
  }>;
  type: CustomFieldsPresetType;
};

export function SelectPresetToEdit({ useRouter, type }: SelectPresetToEditProps) {
  const router = useRouter();

  return (
    <SelectPreset
      onSelect={({ name, type }) => router.push('EditPreset', { name, type, useRouter })}
      useRouter={useRouter}
      type={type}
    />
  );
}
