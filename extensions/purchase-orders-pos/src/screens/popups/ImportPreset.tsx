import { ClosePopupFn, useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { Text, ScrollView, Stack, List, ListRow } from '@shopify/retail-ui-extensions-react';
import {
  CustomFieldsPreset,
  usePurchaseOrderCustomFieldsPresetsQuery,
} from '@work-orders/common/queries/use-purchase-order-custom-fields-presets-query.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { useState } from 'react';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';

export function ImportPreset() {
  const [query, setQuery] = useState('');

  const { Screen, closePopup } = useScreen('ImportPreset', () => {
    setQuery('');
  });

  const fetch = useAuthenticatedFetch();
  const presetsQuery = usePurchaseOrderCustomFieldsPresetsQuery({ fetch });
  const presets = presetsQuery.data ?? [];

  const rows = getPresetRows(presets, query, closePopup);

  return (
    <Screen title={'Import Preset'} presentation={{ sheet: true }}>
      <ScrollView>
        <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {presetsQuery.isRefetching ? 'Reloading...' : ' '}
          </Text>
        </Stack>
        <ControlledSearchBar
          value={query}
          onTextChange={(query: string) => setQuery(query)}
          onSearch={() => {}}
          placeholder="Search presets"
        />
        <List data={rows} />
        {presetsQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading presets...
            </Text>
          </Stack>
        )}
        {presetsQuery.isSuccess && rows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No presets found
            </Text>
          </Stack>
        )}
        {presetsQuery.isError && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              {extractErrorMessage(presetsQuery.error, 'Error loading presets')}
            </Text>
          </Stack>
        )}
      </ScrollView>
    </Screen>
  );
}

function getPresetRows(presets: CustomFieldsPreset[], query: string, closePopup: ClosePopupFn<'ImportPreset'>) {
  const queryFilter = (preset: CustomFieldsPreset) => preset.name.toLowerCase().includes(query.toLowerCase());

  const FIELD_PREVIEW_COUNT = 5;

  return presets.filter(queryFilter).map<ListRow>(preset => {
    const subtitle =
      preset.keys.slice(0, FIELD_PREVIEW_COUNT).join(', ') + (preset.keys.length > FIELD_PREVIEW_COUNT ? '...' : '');

    return {
      id: preset.name,
      onPress: () => closePopup({ keys: preset.keys }),
      leftSide: {
        label: preset.name,
        subtitle: [subtitle],
      },
    };
  });
}