import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { UpsertCustomFieldsPreset } from '@web/schemas/generated/upsert-custom-fields-preset.js';
import {
  CustomFieldsPresetType,
  UpsertCustomFieldsPresetResponse,
} from '@web/controllers/api/custom-fields-presets.js';

export const useCustomFieldsPresetsMutation = (
  { fetch, type }: { fetch: Fetch; type: CustomFieldsPresetType },
  options?: UseMutationOptions<UpsertCustomFieldsPresetResponse, unknown, UpsertCustomFieldsPreset, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ currentName, ...input }: { currentName?: string } & UpsertCustomFieldsPreset) => {
      const response = await fetch(
        `/api/custom-fields-presets/${encodeURIComponent(type)}/${encodeURIComponent(currentName ?? input.name)}`,
        {
          method: 'POST',
          body: JSON.stringify(input),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to mutate custom fields preset '${currentName}'`);
      }

      const body: UpsertCustomFieldsPresetResponse = await response.json();
      return body;
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields-presets', type] });

      options?.onSuccess?.(...args);
    },
  });
};
