import { Fetch } from './fetch.js';
import { useQuery } from 'react-query';
import { FetchWorkOrderCustomFieldsPresetsResponse } from '@web/controllers/api/work-order-custom-fields-presets.js';

export const useWorkOrderCustomFieldsPresetsQuery = ({ fetch }: { fetch: Fetch }) =>
  useQuery({
    queryKey: ['work-order-custom-fields-presets'],
    queryFn: async () => {
      const response = await fetch('/api/work-order-custom-fields-presets');

      if (!response.ok) {
        throw new Error('Failed to fetch work order custom fields presets');
      }

      const { presets }: FetchWorkOrderCustomFieldsPresetsResponse = await response.json();
      return presets;
    },
  });

export type CustomFieldsPreset = FetchWorkOrderCustomFieldsPresetsResponse['presets'][number];
