import type { ShopSettings } from '@web/services/settings/schema.js';
import { BlockStack, Checkbox, Text, TextField } from '@shopify/polaris';

export function LabourSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  return (
    <BlockStack gap="400">
      <TextField
        label={'Default Labour Line Item Name'}
        autoComplete={'off'}
        value={settings.workOrders.charges.defaultLabourLineItemName}
        onChange={defaultLabourLineItemName =>
          setSettings({
            ...settings,
            workOrders: {
              ...settings.workOrders,
              charges: {
                ...settings.workOrders.charges,
                defaultLabourLineItemName,
              },
            },
          })
        }
      />
      <TextField
        label={'Labour Line Item SKU'}
        autoComplete={'off'}
        value={settings.workOrders.charges.defaultLabourLineItemSKU}
        onChange={defaultLabourLineItemSKU =>
          setSettings({
            ...settings,
            workOrders: {
              ...settings.workOrders,
              charges: {
                ...settings.workOrders.charges,
                defaultLabourLineItemSKU,
              },
            },
          })
        }
      />
      <BlockStack>
        <Text as={'p'}>Enabled Labour Options</Text>
        <Checkbox
          label={'Employee Assignments'}
          checked={settings.workOrders.charges.allowEmployeeAssignments}
          onChange={allowEmployeeAssignments =>
            setSettings({
              ...settings,
              workOrders: {
                ...settings.workOrders,
                charges: {
                  ...settings.workOrders.charges,
                  allowEmployeeAssignments,
                },
              },
            })
          }
        />
        <Checkbox
          label={'Hourly Labour'}
          checked={settings.workOrders.charges.allowHourlyLabour}
          onChange={allowHourlyLabour =>
            setSettings({
              ...settings,
              workOrders: {
                ...settings.workOrders,
                charges: {
                  ...settings.workOrders.charges,
                  allowHourlyLabour,
                },
              },
            })
          }
        />
        <Checkbox
          label={'Fixed-Price Labour'}
          checked={settings.workOrders.charges.allowFixedPriceLabour}
          onChange={allowFixedPriceLabour =>
            setSettings({
              ...settings,
              workOrders: {
                ...settings.workOrders,
                charges: {
                  ...settings.workOrders.charges,
                  allowFixedPriceLabour,
                },
              },
            })
          }
        />
      </BlockStack>
    </BlockStack>
  );
}
