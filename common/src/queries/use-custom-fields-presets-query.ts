import { Fetch } from './fetch.js';
import { useQuery } from 'react-query';
import {
  CustomFieldsPresetType,
  FetchCustomFieldsPresetsResponse,
} from '@web/controllers/api/custom-fields-presets.js';

export const useCustomFieldsPresetsQuery = (
  { fetch, type }: { fetch: Fetch; type: CustomFieldsPresetType },
  options?: { staleTime?: number },
) =>
  useQuery({
    ...options,
    queryKey: ['custom-fields-presets', type],
    queryFn: async () => {
      const response = await fetch(`/api/custom-fields-presets/${encodeURIComponent(type)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch custom fields presets');
      }

      const { presets }: FetchCustomFieldsPresetsResponse = await response.json();

      const defaultCustomFieldPresets = presets.filter(preset => preset.default);
      const defaultCustomFieldKeys = defaultCustomFieldPresets.flatMap(preset => preset.keys);
      const defaultCustomFields = Object.fromEntries(defaultCustomFieldKeys.map(key => [key, '']));

      return {
        presets,
        defaultCustomFields,
      };
    },
  });

export type CustomFieldsPreset = FetchCustomFieldsPresetsResponse['presets'][number];
