import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { Filters, Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';

export function ImportCustomFieldPresetModal({
  open,
  onOverride,
  onMerge,
  onClose,
  setToastAction,
}: {
  open: boolean;
  onClose: () => void;
  onOverride: (fieldNames: string[]) => void;
  onMerge: (fieldNames: string[]) => void;
  setToastAction: ToastActionCallable;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const presetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'PURCHASE_ORDER' });

  const [query, setQuery] = useState('');

  const presets = presetsQuery.data ?? [];
  const filteredPresets = presets.filter(preset => {
    return (
      preset.name.toLowerCase().includes(query.toLowerCase()) ||
      preset.keys.some(key => key.toLowerCase().includes(query.toLowerCase()))
    );
  });

  return (
    <Modal open={open} title={'Import Custom Field Preset'} onClose={onClose}>
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
          <ResourceItem
            id={preset.name}
            onClick={() => {}}
            persistActions
            shortcutActions={[
              {
                content: 'Override',
                onAction: () => {
                  onOverride([...preset.keys]);
                  setToastAction({ content: 'Imported preset' });
                  onClose();
                },
              },
              {
                content: 'Merge',
                onAction: () => {
                  onMerge([...preset.keys]);
                  setToastAction({ content: 'Imported preset' });
                  onClose();
                },
              },
            ]}
          >
            <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
              {preset.name}
            </Text>
            <Text as={'p'} variant={'bodyMd'}>
              {preset.keys.join(', ')}
            </Text>
          </ResourceItem>
        )}
      />
    </Modal>
  );
}
