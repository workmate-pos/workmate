import { Fetch } from './fetch.js';
import { useQuery } from 'react-query';
import { FetchCustomFieldValueOptionsResponse } from '@web/controllers/api/custom-fields.js';

export const useCustomFieldValueOptionsQuery = ({ fetch, name }: { fetch: Fetch; name: string }) =>
  useQuery({
    queryKey: ['custom-field-value-options', name],
    queryFn: async () => {
      const response = await fetch(`/api/custom-fields/field/${encodeURIComponent(name)}/options`);

      if (!response.ok) {
        throw new Error('Failed to fetch custom field value options');
      }

      const { options }: FetchCustomFieldValueOptionsResponse = await response.json();
      return options;
    },
  });
