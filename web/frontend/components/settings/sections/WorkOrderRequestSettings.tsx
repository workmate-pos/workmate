import type { ShopSettings } from '@web/services/settings/schema.js';
import { BlockStack, Checkbox, Select } from '@shopify/polaris';

export function WorkOrderRequestSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  return (
    <BlockStack gap="400">
      <Checkbox
        label={'Enable work order requests'}
        checked={settings.workOrderRequests.enabled}
        onChange={enabled =>
          setSettings({
            ...settings,
            workOrderRequests: enabled ? { enabled, status: settings.statuses[0]! } : { enabled, status: null },
          })
        }
      />
      <Select
        label={'Request Status'}
        helpText={'The status that work order requests will be set to when created'}
        disabled={!settings.workOrderRequests.enabled}
        options={settings.statuses}
        placeholder={'Select a status'}
        value={settings.workOrderRequests?.status ?? undefined}
        onChange={status =>
          setSettings({
            ...settings,
            workOrderRequests: {
              enabled: true,
              status,
            },
          })
        }
      />
    </BlockStack>
  );
}
