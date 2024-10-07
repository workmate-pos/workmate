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
                  if (!settings.purchaseOrders.statuses.includes(purchaseOrderStatusValue)) {
                    setSettings({
                      ...settings,
                      purchaseOrders: {
                        ...settings.purchaseOrders,
                        statuses: [...settings.purchaseOrders.statuses, purchaseOrderStatusValue],
                      },
                    });
                  }
                  setPurchaseOrderStatusValue('');
                },
              }
            : undefined
        }
      />

      <InlineStack gap="200">
        {settings.purchaseOrders.statuses.map((status, i) => (
          <Tag
            key={i}
            onRemove={() =>
              setSettings({
                ...settings,
                purchaseOrders: {
                  ...settings.purchaseOrders,
                  statuses: settings.purchaseOrders.statuses.filter((_, j) => i !== j),
                },
              })
            }
          >
            {status}
          </Tag>
        ))}
      </InlineStack>

      <Autocomplete
        options={settings.purchaseOrders.statuses.map(status => ({ id: status, label: status, value: status }))}
        selected={[settings.purchaseOrders.defaultStatus]}
        onSelect={([defaultPurchaseOrderStatus]) => {
          setSettings(current => ({
            ...current,
            purchaseOrders: {
              ...current.purchaseOrders,
              defaultStatus: defaultPurchaseOrderStatus ?? current.purchaseOrders.defaultStatus,
            },
          }));
          setDefaultPurchaseOrderStatusValue(defaultPurchaseOrderStatus ?? settings.purchaseOrders.defaultStatus);
        }}
        textField={
          <Autocomplete.TextField
            label="Default Status"
            autoComplete="off"
            requiredIndicator
            value={defaultPurchaseOrderStatusValue}
            onChange={setDefaultPurchaseOrderStatusValue}
            onBlur={() => setDefaultPurchaseOrderStatusValue(settings.purchaseOrders.defaultStatus)}
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
        value={settings.purchaseOrders.idFormat}
        onChange={value =>
          setSettings({
            ...settings,
            purchaseOrders: {
              ...settings.purchaseOrders,
              idFormat: value,
            },
          })
        }
      />
    </BlockStack>
  );
}
