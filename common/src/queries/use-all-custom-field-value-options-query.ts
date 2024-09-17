import { Fetch } from './fetch.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FetchCustomFieldNamesResponse,
  FetchCustomFieldValueOptionsResponse,
} from '@web/controllers/api/custom-fields.js';
import { UseQueryData } from './react-query.js';
import { useCustomFieldValueOptionsQuery } from './use-custom-field-value-options-query.js';

export const useAllCustomFieldValueOptionsQuery = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['all-custom-field-value-options'],
    queryFn: async () => {
      const response = await fetch(`/api/custom-fields/fields`);

      if (!response.ok) {
        throw new Error('Failed to fetch custom field value options');
      }

      const { fields }: FetchCustomFieldNamesResponse = await response.json();

      for (const { name, options } of fields) {
        queryClient.setQueryData(
          ['custom-field-value-options', name],
          options satisfies UseQueryData<typeof useCustomFieldValueOptionsQuery>,
        );
      }

      return fields;
    },
  });
};
