import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useEffect, useState } from 'react';
import { useCustomFieldValueOptionsQuery } from '@work-orders/common/queries/use-custom-field-value-options-query.js';
import { useSaveCustomFieldValueOptionsMutation } from '@work-orders/common/queries/use-save-custom-field-value-options-mutation.js';
import { useDeleteCustomFieldValueOptionsMutation } from '@work-orders/common/queries/use-delete-custom-field-value-options-mutation.js';
import { FormLayout, Modal, Tabs, Text, TextField } from '@shopify/polaris';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

const tabIds = ['allow-any-value', 'choose-from-options'] as const;
type TabId = (typeof tabIds)[number];

export function CustomFieldValuesModal({ open, onClose, name }: { open: boolean; onClose: () => void; name: string }) {
  const [tab, setTab] = useState<TabId>('allow-any-value');
  const [options, setOptions] = useState<string[]>([]);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const customFieldValueOptionsQuery = useCustomFieldValueOptionsQuery({ fetch, name });
  const saveCustomFieldValueOptionsMutation = useSaveCustomFieldValueOptionsMutation({ fetch });
  const deleteCustomFieldValueOptionsMutation = useDeleteCustomFieldValueOptionsMutation({ fetch });

  useEffect(() => {
    if (customFieldValueOptionsQuery.data) {
      setTab(customFieldValueOptionsQuery.data.length > 0 ? 'choose-from-options' : 'allow-any-value');
      setOptions(customFieldValueOptionsQuery.data);
    }
  }, [customFieldValueOptionsQuery.data]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={'Custom Field Values'}
        primaryAction={{
          content: 'Save',
          loading: saveCustomFieldValueOptionsMutation.isLoading || deleteCustomFieldValueOptionsMutation.isLoading,
          onAction: () => {
            const onSuccess = () => {
              setToastAction({ content: 'Saved custom field options!' });
              onClose();
            };

            if (tab === 'allow-any-value') {
              deleteCustomFieldValueOptionsMutation.mutate({ name }, { onSuccess });
            } else if (tab === 'choose-from-options') {
              saveCustomFieldValueOptionsMutation.mutate({ name, values: options }, { onSuccess });
            } else {
              return tab satisfies never;
            }
          },
        }}
      >
        {customFieldValueOptionsQuery.isError && (
          <Modal.Section>
            <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'} tone={'critical'}>
              {extractErrorMessage(
                customFieldValueOptionsQuery.error,
                'An error occurred while loading custom field values',
              )}
            </Text>
          </Modal.Section>
        )}

        {customFieldValueOptionsQuery.isLoading && (
          <Modal.Section>
            <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
              Loading custom field values...
            </Text>
          </Modal.Section>
        )}

        {!customFieldValueOptionsQuery.isLoading &&
          !customFieldValueOptionsQuery.isError &&
          !customFieldValueOptionsQuery.data && (
            <Modal.Section>
              <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                Something went wrong
              </Text>
            </Modal.Section>
          )}

        {customFieldValueOptionsQuery.data && (
          <Modal.Section>
            <Tabs
              tabs={tabIds.map(id => ({
                id,
                content: titleCase(id),
              }))}
              selected={tabIds.indexOf(tab)}
              onSelect={index => setTab(tabIds[index] ?? tab)}
            >
              {tab === 'allow-any-value' && <AllowAnyValue />}
              {tab === 'choose-from-options' && <ChooseFromOptions options={options} setOptions={setOptions} />}
            </Tabs>
          </Modal.Section>
        )}
      </Modal>

      {toast}
    </>
  );
}

function AllowAnyValue() {
  return (
    <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
      Allow any value
    </Text>
  );
}

function ChooseFromOptions({ options, setOptions }: { options: string[]; setOptions: (options: string[]) => void }) {
  const [changedOptions, setChangedOptions] = useState(options);
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    setChangedOptions(options);
  }, [options]);

  return (
    <FormLayout>
      {changedOptions.map((option, i) => (
        <TextField
          label={`Option ${i + 1}`}
          autoComplete="off"
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
        autoComplete="off"
        value={newOption}
        onChange={setNewOption}
        onBlur={() => {
          if (newOption.trim().length > 0) {
            setOptions([...options, newOption]);
            setNewOption('');
          }
        }}
      />
    </FormLayout>
  );
}
