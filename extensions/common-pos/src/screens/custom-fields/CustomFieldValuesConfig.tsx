import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useCustomFieldValueOptionsQuery } from '@work-orders/common/queries/use-custom-field-value-options-query.js';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  Button,
  ScrollView,
  SegmentedControl,
  Stack,
  Text,
  TextField,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useSaveCustomFieldValueOptionsMutation } from '@work-orders/common/queries/use-save-custom-field-value-options-mutation.js';
import { useDeleteCustomFieldValueOptionsMutation } from '@work-orders/common/queries/use-delete-custom-field-value-options-mutation.js';
import { UseRouter } from '../router.js';

const tabIds = ['allow-any-value', 'choose-from-options'] as const;
type TabId = (typeof tabIds)[number];

function isTabId(id: string): id is TabId {
  return (tabIds as readonly string[]).includes(id);
}

export type CustomFieldValuesConfigProps = {
  name: string;
  useRouter: UseRouter;
};

/**
 * Screen to configure the possible values for some custom field.
 */
export function CustomFieldValuesConfig({ name, useRouter }: CustomFieldValuesConfigProps) {
  const [tab, setTab] = useState<TabId>('allow-any-value');
  const [options, setOptions] = useState<string[]>([]);

  const { toast } = useExtensionApi<'pos.home.modal.render'>();
  const fetch = useAuthenticatedFetch();
  const customFieldValueOptionsQuery = useCustomFieldValueOptionsQuery({
    fetch,
    name,
  });
  const saveCustomFieldValueOptionsMutation = useSaveCustomFieldValueOptionsMutation({ fetch });
  const deleteCustomFieldValueOptionsMutation = useDeleteCustomFieldValueOptionsMutation({ fetch });

  const isLoading = [
    customFieldValueOptionsQuery,
    saveCustomFieldValueOptionsMutation,
    deleteCustomFieldValueOptionsMutation,
  ].some(query => query.isLoading);

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(name);
  screen.setIsLoading(isLoading);

  useEffect(() => {
    if (customFieldValueOptionsQuery.data) {
      setTab(customFieldValueOptionsQuery.data.length > 0 ? 'choose-from-options' : 'allow-any-value');
      setOptions(customFieldValueOptionsQuery.data);
    }
  }, [customFieldValueOptionsQuery.data]);

  if (customFieldValueOptionsQuery.isError) {
    return (
      <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
        <Text color={'TextCritical'}>
          {extractErrorMessage(customFieldValueOptionsQuery.error, 'An error occurred')}
        </Text>
      </Stack>
    );
  }

  if (customFieldValueOptionsQuery.isLoading) {
    return null;
  }

  if (!customFieldValueOptionsQuery.data) {
    return (
      <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
        <Text color={'TextSubdued'}>Something went wrong</Text>
      </Stack>
    );
  }

  return (
    <ScrollView>
      <SegmentedControl
        segments={tabIds.map(id => ({
          id,
          label: titleCase(id),
          disabled: false,
        }))}
        selected={tab}
        onSelect={(selected: string) => setTab(isTabId(selected) ? selected : tab)}
      />

      {tab === 'allow-any-value' && <AllowAnyValue />}
      {tab === 'choose-from-options' && <ChooseFromOptions options={options} setOptions={setOptions} />}

      <Stack direction={'vertical'} paddingVertical={'ExtraLarge'}>
        <Button
          title={'Save'}
          type={'primary'}
          isLoading={isLoading}
          onPress={() => {
            const onSuccess = () => {
              toast.show('Saved custom field options!');
              router.popCurrent();
            };

            if (tab === 'allow-any-value') {
              deleteCustomFieldValueOptionsMutation.mutate({ name }, { onSuccess });
            } else if (tab === 'choose-from-options') {
              saveCustomFieldValueOptionsMutation.mutate({ name, values: options }, { onSuccess });
            } else {
              return tab satisfies never;
            }
          }}
        />
      </Stack>
    </ScrollView>
  );
}

function AllowAnyValue() {
  return (
    <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
      <Text color={'TextSubdued'}>Allow any value</Text>
    </Stack>
  );
}

function ChooseFromOptions({
  options,
  setOptions,
}: {
  options: string[];
  setOptions: Dispatch<SetStateAction<string[]>>;
}) {
  const [changedOptions, setChangedOptions] = useState(options);
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    setChangedOptions(options);
  }, [options]);

  return (
    <ResponsiveGrid columns={3}>
      {changedOptions.map((option, i) => (
        <TextField
          label={`Option ${i + 1}`}
          value={option}
          onChange={(option: string) =>
            setChangedOptions([...changedOptions.slice(0, i), option, ...changedOptions.slice(i + 1)])
          }
          onBlur={() => {
            const shouldDelete = option.trim().length === 0;
            if (shouldDelete) {
              setOptions([...changedOptions.slice(0, i), ...changedOptions.slice(i + 1)]);
            } else {
              setOptions(changedOptions);
            }
          }}
        />
      ))}

      <TextField
        label={'New option'}
        value={newOption}
        onChange={setNewOption}
        onBlur={() => {
          if (newOption.trim().length > 0) {
            setOptions([...options, newOption]);
            setNewOption('');
          }
        }}
      />
    </ResponsiveGrid>
  );
}
