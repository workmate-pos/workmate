import { Text, ScrollView, Stack, List, ListRow } from '@shopify/retail-ui-extensions-react';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { Router, UseRouter } from '../router.js';
import { CustomFieldsPresetType } from '@web/controllers/api/custom-fields-presets.js';
import {
  CustomFieldsPreset,
  useCustomFieldsPresetsQuery,
} from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

export type ImportPresetProps = {
  onImport: (preset: { keys: string[] }) => void;
  useRouter: UseRouter;
  type: CustomFieldsPresetType;
};

export function ImportPreset({ onImport, useRouter, type }: ImportPresetProps) {
  const [query, setQuery] = useState('');

  const fetch = useAuthenticatedFetch();
  const presetsQuery = useCustomFieldsPresetsQuery({ fetch, type });
  const presets = presetsQuery.data ?? [];

  const router = useRouter();

  const rows = getPresetRows(presets, query, onImport, router);

  return (
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
  );
}

function getPresetRows(
  presets: CustomFieldsPreset[],
  query: string,
  onImport: (preset: { keys: string[] }) => void,
  router: Router,
) {
  const queryFilter = (preset: CustomFieldsPreset) => preset.name.toLowerCase().includes(query.toLowerCase());

  const FIELD_PREVIEW_COUNT = 5;

  return presets.filter(queryFilter).map<ListRow>(preset => {
    const subtitle =
      preset.keys.slice(0, FIELD_PREVIEW_COUNT).join(', ') + (preset.keys.length > FIELD_PREVIEW_COUNT ? '...' : '');

    return {
      id: preset.name,
      onPress: () => {
        onImport({ keys: preset.keys });
        router.popCurrent();
      },
      leftSide: {
        label: preset.name,
        subtitle: [subtitle],
      },
    };
  });
}
