import { Fetch } from './fetch.js';
import { useQuery } from 'react-query';
import {
  CustomFieldsPresetType,
  FetchCustomFieldsPresetsResponse,
} from '@web/controllers/api/custom-fields-presets.js';

export const useCustomFieldsPresetsQuery = ({ fetch, type }: { fetch: Fetch; type: CustomFieldsPresetType }) =>
  useQuery({
    queryKey: ['custom-fields-presets', type],
    queryFn: async () => {
      const response = await fetch(`/api/custom-fields-presets/${encodeURIComponent(type)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch custom fields presets');
      }

      const { presets }: FetchCustomFieldsPresetsResponse = await response.json();
      return presets;
    },
  });

export type CustomFieldsPreset = FetchCustomFieldsPresetsResponse['presets'][number];
