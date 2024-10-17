import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { CustomFieldsPresetType } from '@web/controllers/api/custom-fields-presets.js';
import {
  CustomFieldsPreset,
  useCustomFieldsPresetsQuery,
} from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { Filters, InlineStack, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';

export function SelectCustomFieldPresetModal({
  open,
  onSelect,
  onClose,
  setToastAction,
  type,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (preset: CustomFieldsPreset) => void;
  setToastAction: ToastActionCallable;
  type: CustomFieldsPresetType;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const presetsQuery = useCustomFieldsPresetsQuery({ fetch, type });

  const [query, setQuery] = useState('');

  const presets = presetsQuery.data?.presets ?? [];
  const filteredPresets = presets.filter(preset => {
    return (
      preset.name.toLowerCase().includes(query.toLowerCase()) ||
      preset.keys.some(key => key.toLowerCase().includes(query.toLowerCase()))
    );
  });

  return (
    <Modal open={open} title={'Import custom field preset'} onClose={onClose}>
      <ResourceList
        items={filteredPresets}
        resourceName={{ plural: 'presets', singular: 'preset' }}
        filterControl={
          <Filters
            filters={[]}
            appliedFilters={[]}
            loading={presetsQuery.isLoading}
            queryValue={query}
            queryPlaceholder={'Search presets'}
            onQueryChange={query => setQuery(query)}
            onQueryClear={() => setQuery('')}
            onClearAll={() => setQuery('')}
          />
        }
        loading={presetsQuery.isLoading}
        renderItem={preset => (
          <ResourceItem id={preset.name} onClick={() => onSelect(preset)} persistActions>
            <InlineStack gap={'200'}>
              <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                {preset.name}
              </Text>
              {preset.default && (
                <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                  Default
                </Text>
              )}
            </InlineStack>
            <Text as={'p'} variant={'bodyMd'}>
              {preset.keys.join(', ')}
            </Text>
          </ResourceItem>
        )}
      />
    </Modal>
  );
}
