import { Fetch } from './fetch.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DeleteCustomFieldValueOptionsResponse,
  FetchCustomFieldValueOptionsResponse,
} from '@web/controllers/api/custom-fields.js';
import { UseQueryData } from './react-query.js';
import { useCustomFieldValueOptionsQuery } from './use-custom-field-value-options-query.js';
import { useAllCustomFieldValueOptionsQuery } from './use-all-custom-field-value-options-query.js';

export const useDeleteCustomFieldValueOptionsMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const response = await fetch(`/api/custom-fields/field/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete custom field value options');
      }

      const body: DeleteCustomFieldValueOptionsResponse = await response.json();
      return body;
    },
    onSuccess({ success }, input) {
      if (success) {
        queryClient.setQueryData(
          ['custom-field-value-options', input.name],
          [] satisfies UseQueryData<typeof useCustomFieldValueOptionsQuery>,
        );

        type AllCustomFieldValueOptionsData = UseQueryData<typeof useAllCustomFieldValueOptionsQuery>;

        const allCustomFieldValueOptions = queryClient.getQueryData<AllCustomFieldValueOptionsData>([
          'all-custom-field-value-options',
        ]);

        if (allCustomFieldValueOptions) {
          queryClient.setQueryData(
            ['all-custom-field-value-options'],
            allCustomFieldValueOptions.filter(field => field.name !== input.name),
          );
        } else {
          queryClient.invalidateQueries({ queryKey: ['all-custom-field-value-options'] });
        }
      }
    },
  });
};
