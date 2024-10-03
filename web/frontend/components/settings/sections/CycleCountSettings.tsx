import { ShopSettings } from '@web/services/settings/schema.js';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Autocomplete, BlockStack, Icon, InlineStack, Tag, Text, TextField } from '@shopify/polaris';
import { CirclePlusMinor } from '@shopify/polaris-icons';

export function CycleCountSettings({
  settings,
  setSettings,
  defaultStatus: initialDefaultStatus,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
  defaultStatus: string;
}) {
  const [statusValue, setStatusValue] = useState('');
  const [defaultStatusValue, setDefaultStatusValue] = useState(initialDefaultStatus);

  return (
    <BlockStack gap="400">
      <Autocomplete
        options={[]}
        selected={[]}
        textField={
          <Autocomplete.TextField label="Statuses" autoComplete="off" value={statusValue} onChange={setStatusValue} />
        }
        onSelect={() => {}}
        actionBefore={
          statusValue.length > 0
            ? {
                content: `Create status "${statusValue}"`,
                prefix: <Icon source={CirclePlusMinor} />,
                onAction: () => {
                  if (!settings.cycleCount.statuses.includes(statusValue)) {
                    setSettings({
                      ...settings,
                      cycleCount: {
                        ...settings.cycleCount,
                        statuses: [...settings.cycleCount.statuses, statusValue],
                      },
                    });
                  }
                  setStatusValue('');
                },
              }
            : undefined
        }
      />

      <InlineStack gap="200">
        {settings.cycleCount.statuses.map((status, i) => (
          <Tag
            key={i}
            onRemove={() =>
              setSettings({
                ...settings,
                cycleCount: {
                  ...settings.cycleCount,
                  statuses: settings.cycleCount.statuses.filter((_, j) => i !== j),
                },
              })
            }
          >
            {status}
          </Tag>
        ))}
      </InlineStack>

      <Autocomplete
        options={settings.cycleCount.statuses.map(status => ({ id: status, label: status, value: status }))}
        selected={[settings.cycleCount.defaultStatus]}
        onSelect={([value]) => {
          const defaultStatus = value ?? settings.cycleCount.defaultStatus;

          setSettings({
            ...settings,
            cycleCount: {
              ...settings.cycleCount,
              defaultStatus,
            },
          });

          setDefaultStatusValue(defaultStatus);
        }}
        textField={
          <Autocomplete.TextField
            label="Default Status"
            autoComplete="off"
            requiredIndicator
            value={defaultStatusValue}
            onChange={setDefaultStatusValue}
            onBlur={() => setDefaultStatusValue(settings.cycleCount.defaultStatus)}
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
        value={settings.cycleCount.idFormat}
        onChange={value =>
          setSettings({
            ...settings,
            cycleCount: {
              ...settings.cycleCount,
              idFormat: value,
            },
          })
        }
      />
    </BlockStack>
  );
}
