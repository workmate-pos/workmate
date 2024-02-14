import { Fetch } from './fetch.js';
import { useQuery } from 'react-query';
import { FetchPurchaseOrderCustomFieldsPresetsResponse } from '@web/controllers/api/purchase-order-custom-fields-presets.js';

export const usePurchaseOrderCustomFieldsPresetsQuery = ({ fetch }: { fetch: Fetch }) =>
  useQuery({
    queryKey: ['purchase-order-custom-fields-presets'],
    queryFn: async () => {
      const response = await fetch('/api/purchase-order-custom-fields-presets');

      if (!response.ok) {
        throw new Error('Failed to fetch purchase order custom fields presets');
      }

      const { presets }: FetchPurchaseOrderCustomFieldsPresetsResponse = await response.json();
      return presets;
    },
  });

export type CustomFieldsPreset = FetchPurchaseOrderCustomFieldsPresetsResponse['presets'][number];
