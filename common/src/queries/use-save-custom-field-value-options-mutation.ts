import { Fetch } from './fetch.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FetchCustomFieldValueOptionsResponse } from '@web/controllers/api/custom-fields.js';
import { UseQueryData } from './react-query.js';
import { useCustomFieldValueOptionsQuery } from './use-custom-field-value-options-query.js';
import { useAllCustomFieldValueOptionsQuery } from './use-all-custom-field-value-options-query.js';

export const useSaveCustomFieldValueOptionsMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, values }: { name: string; values: string[] }) => {
      const response = await fetch(`/api/custom-fields/field/${encodeURIComponent(name)}`, {
        method: 'POST',
        body: JSON.stringify({ options: values }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to save custom field value options');
      }

      const { options }: FetchCustomFieldValueOptionsResponse = await response.json();
      return options;
    },
    onSuccess(options, input) {
      queryClient.setQueryData(
        ['custom-field-value-options', input.name],
        options satisfies UseQueryData<typeof useCustomFieldValueOptionsQuery>,
      );

      type AllCustomFieldValueOptionsData = UseQueryData<typeof useAllCustomFieldValueOptionsQuery>;

      const allCustomFieldValueOptions = queryClient.getQueryData<AllCustomFieldValueOptionsData>([
        'all-custom-field-value-options',
      ]);

      if (allCustomFieldValueOptions) {
        const shouldInsert = !allCustomFieldValueOptions.some(field => field.name === input.name);

        const queryData: AllCustomFieldValueOptionsData = shouldInsert
          ? [...allCustomFieldValueOptions, { name: input.name, options }]
          : allCustomFieldValueOptions.map(field => (field.name === input.name ? { ...field, options } : field));

        queryClient.setQueryData(['all-custom-field-value-options'], queryData);
      } else {
        queryClient.invalidateQueries({ queryKey: ['all-custom-field-value-options'] });
      }
    },
  });
};
