import type { ShopSettings } from '@web/services/settings/schema.js';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Autocomplete, BlockStack, Icon, InlineStack, Tag, Text, TextField } from '@shopify/polaris';
import { CirclePlusMinor } from '@shopify/polaris-icons';

export function WorkOrderSettings({
  settings,
  setSettings,
  defaultWorkOrderStatusValue: initialDefaultWorkOrderStatusValue,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
  defaultWorkOrderStatusValue: string;
}) {
  const [workOrderStatusValue, setWorkOrderStatusValue] = useState('');
  const [defaultWorkOrderStatusValue, setDefaultWorkOrderStatusValue] = useState('');

  useEffect(() => {
    setDefaultWorkOrderStatusValue(initialDefaultWorkOrderStatusValue);
  }, [initialDefaultWorkOrderStatusValue]);

  return (
    <BlockStack gap="400">
      <Autocomplete
        options={[]}
        selected={[]}
        textField={
          <Autocomplete.TextField
            label="Statuses"
            autoComplete="off"
            value={workOrderStatusValue}
            onChange={setWorkOrderStatusValue}
          />
        }
        onSelect={() => {}}
        actionBefore={
          workOrderStatusValue.length > 0
            ? {
                content: `Create status "${workOrderStatusValue}"`,
                prefix: <Icon source={CirclePlusMinor} />,
                onAction: () => {
                  if (!settings.workOrders.statuses.includes(workOrderStatusValue)) {
                    setSettings({
                      ...settings,
                      workOrders: {
                        ...settings.workOrders,
                        statuses: [...settings.workOrders.statuses, workOrderStatusValue],
                      },
                    });
                  }
                  setWorkOrderStatusValue('');
                },
              }
            : undefined
        }
      />

      <InlineStack gap="200">
        {settings.workOrders.statuses.map((status, i) => (
          <Tag
            key={i}
            onRemove={() =>
              setSettings({
                ...settings,
                workOrders: {
                  ...settings.workOrders,
                  statuses: settings.workOrders.statuses.filter((_, j) => i !== j),
                },
              })
            }
          >
            {status}
          </Tag>
        ))}
      </InlineStack>
      <Autocomplete
        options={settings.workOrders.statuses.map(status => ({ id: status, label: status, value: status }))}
        selected={[settings.workOrders.defaultStatus]}
        onSelect={([defaultStatus]) => {
          setSettings(current => ({
            ...current,
            workOrders: {
              ...current.workOrders,
              defaultStatus: defaultStatus ?? current.workOrders.defaultStatus,
            },
          }));
          setDefaultWorkOrderStatusValue(defaultStatus ?? settings.workOrders.defaultStatus);
        }}
        textField={
          <Autocomplete.TextField
            label="Default Status"
            autoComplete="off"
            requiredIndicator
            value={defaultWorkOrderStatusValue}
            onChange={setDefaultWorkOrderStatusValue}
            onBlur={() => setDefaultWorkOrderStatusValue(settings.workOrders.defaultStatus)}
          />
        }
      />
      <TextField
        label="ID Format"
        autoComplete="off"
        requiredIndicator
        helpText={
          <>
            You can use variables by surrounding them in curly braces.
            <br />
            Available variables:{' '}
            <Text as="p" fontWeight="semibold">
              {'{{id}}, {{year}}, {{month}}, {{day}}, {{hour}}, {{minute}}'}
            </Text>
          </>
        }
        value={settings.workOrders.idFormat}
        onChange={idFormat =>
          setSettings({
            ...settings,
            workOrders: {
              ...settings.workOrders,
              idFormat,
            },
          })
        }
      />
    </BlockStack>
  );
}
