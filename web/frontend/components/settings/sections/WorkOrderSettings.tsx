import type { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Autocomplete, BlockStack, Divider, Icon, InlineStack, Tag, Text, TextField } from '@shopify/polaris';
import { CirclePlusMinor } from '@shopify/polaris-icons';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

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
                  setSettings({
                    ...settings,
                    statuses: [...settings.statuses, workOrderStatusValue],
                  });
                  setWorkOrderStatusValue('');
                },
              }
            : undefined
        }
      />

      <InlineStack gap="200">
        {settings.statuses.map((status, i) => (
          <Tag
            key={i}
            onRemove={() =>
              setSettings({
                ...settings,
                statuses: settings.statuses.filter((_, j) => i !== j),
              })
            }
          >
            {status}
          </Tag>
        ))}
      </InlineStack>
      <Autocomplete
        options={settings.statuses.map(status => ({ id: status, label: status, value: status }))}
        selected={[settings.defaultStatus]}
        onSelect={([defaultStatus]) => {
          setSettings(current => ({
            ...current,
            defaultStatus: defaultStatus ?? current.defaultStatus,
          }));
          setDefaultWorkOrderStatusValue(defaultStatus ?? settings.defaultStatus);
        }}
        textField={
          <Autocomplete.TextField
            label="Default Status"
            autoComplete="off"
            requiredIndicator
            value={defaultWorkOrderStatusValue}
            onChange={setDefaultWorkOrderStatusValue}
            onBlur={() => setDefaultWorkOrderStatusValue(settings.defaultStatus)}
          />
        }
      />

      <Divider />

      <BlockStack gap={'200'}>
        <BlockStack gap={'100'}>
          <Text as="h3" variant="headingMd">
            Work Order ID Formats
          </Text>
          You can use variables by surrounding them in curly braces.
          <br />
          Available variables:{' '}
          <Text as="p" fontWeight="semibold">
            {'{{id}}, {{year}}, {{month}}, {{day}}, {{hour}}, {{minute}}'}
          </Text>
        </BlockStack>

        {Object.entries(settings.workOrderTypes).map(([type, typeConfig]) => (
          <TextField
            label={`${titleCase(type)} ID Format`}
            autoComplete="off"
            requiredIndicator
            value={typeConfig.idFormat}
            onChange={value =>
              setSettings({
                ...settings,
                workOrderTypes: {
                  ...settings.workOrderTypes,
                  [type]: { ...typeConfig, idFormat: value },
                },
              })
            }
          />
        ))}
      </BlockStack>
    </BlockStack>
  );
}
