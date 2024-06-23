import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import {
  CustomFieldsPresetType,
  DeleteCustomFieldsPresetResponse,
} from '@web/controllers/api/custom-fields-presets.js';

export const useCustomFieldsPresetsDeleteMutation = (
  { fetch, type }: { fetch: Fetch; type: CustomFieldsPresetType },
  options?: UseMutationOptions<DeleteCustomFieldsPresetResponse, unknown, { name: string }, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async ({ name }: { name: string }) => {
      const response = await fetch(
        `/api/custom-fields-presets/${encodeURIComponent(type)}/${encodeURIComponent(name)}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to delete custom fields preset '${name}'`);
      }

      const body: DeleteCustomFieldsPresetResponse = await response.json();
      return body;
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries(['custom-fields-presets', type]);

      options?.onSuccess?.(...args);
    },
  });
};
