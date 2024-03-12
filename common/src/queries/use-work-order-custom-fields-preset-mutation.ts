import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { UpsertCustomFieldsPresetResponse } from '@web/controllers/api/work-order-custom-fields-presets.js';
import { UpsertCustomFieldsPreset } from '@web/schemas/generated/upsert-custom-fields-preset.js';

export const useWorkOrderCustomFieldsPresetMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<UpsertCustomFieldsPresetResponse, unknown, UpsertCustomFieldsPreset, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ name, ...input }: { name: string } & UpsertCustomFieldsPreset) => {
      const response = await fetch(`/api/work-order-custom-fields-presets/${encodeURIComponent(name)}`, {
        method: 'POST',
        body: JSON.stringify(input),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to mutate work order custom fields preset '${name}'`);
      }

      const body: UpsertCustomFieldsPresetResponse = await response.json();
      return body;
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries('work-order-custom-fields-presets');

      options?.onSuccess?.(...args);
    },
  });
};
