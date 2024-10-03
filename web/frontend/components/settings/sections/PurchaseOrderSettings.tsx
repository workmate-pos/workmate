import type { ShopSettings } from '@web/services/settings/schema.js';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Autocomplete, BlockStack, Icon, InlineStack, Tag, Text, TextField } from '@shopify/polaris';
import { CirclePlusMinor } from '@shopify/polaris-icons';

export function PurchaseOrderSettings({
  settings,
  setSettings,
  defaultPurchaseOrderStatusValue: initialDefaultPurchaseOrderStatusValue,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
  defaultPurchaseOrderStatusValue: string;
}) {
  const [purchaseOrderStatusValue, setPurchaseOrderStatusValue] = useState('');
  const [defaultPurchaseOrderStatusValue, setDefaultPurchaseOrderStatusValue] = useState('');

  useEffect(() => {
    setDefaultPurchaseOrderStatusValue(initialDefaultPurchaseOrderStatusValue);
  }, [initialDefaultPurchaseOrderStatusValue]);

  return (
    <BlockStack gap="400">
      <Autocomplete
        options={[]}
        selected={[]}
        textField={
          <Autocomplete.TextField
            label="Statuses"
            autoComplete="off"
            value={purchaseOrderStatusValue}
            onChange={setPurchaseOrderStatusValue}
          />
        }
        onSelect={() => {}}
        actionBefore={
          purchaseOrderStatusValue.length > 0
            ? {
                content: `Create status "${purchaseOrderStatusValue}"`,
                prefix: <Icon source={CirclePlusMinor} />,
                onAction: () => {
                  if (!settings.purchaseOrderStatuses.includes(purchaseOrderStatusValue)) {
                    setSettings({
                      ...settings,
                      purchaseOrderStatuses: [...settings.purchaseOrderStatuses, purchaseOrderStatusValue],
                    });
                  }
                  setPurchaseOrderStatusValue('');
                },
              }
            : undefined
        }
      />

      <InlineStack gap="200">
        {settings.purchaseOrderStatuses.map((status, i) => (
          <Tag
            key={i}
            onRemove={() =>
              setSettings({
                ...settings,
                purchaseOrderStatuses: settings.purchaseOrderStatuses.filter((_, j) => i !== j),
              })
            }
          >
            {status}
          </Tag>
        ))}
      </InlineStack>

      <Autocomplete
        options={settings.purchaseOrderStatuses.map(status => ({ id: status, label: status, value: status }))}
        selected={[settings.defaultPurchaseOrderStatus]}
        onSelect={([defaultPurchaseOrderStatus]) => {
          setSettings(current => ({
            ...current,
            defaultPurchaseOrderStatus: defaultPurchaseOrderStatus ?? current.defaultPurchaseOrderStatus,
          }));
          setDefaultPurchaseOrderStatusValue(defaultPurchaseOrderStatus ?? settings.defaultPurchaseOrderStatus);
        }}
        textField={
          <Autocomplete.TextField
            label="Default Status"
            autoComplete="off"
            requiredIndicator
            value={defaultPurchaseOrderStatusValue}
            onChange={setDefaultPurchaseOrderStatusValue}
            onBlur={() => setDefaultPurchaseOrderStatusValue(settings.defaultPurchaseOrderStatus)}
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
        value={settings.purchaseOrderIdFormat}
        onChange={value =>
          setSettings({
            ...settings,
            purchaseOrderIdFormat: value,
          })
        }
      />
    </BlockStack>
  );
}
