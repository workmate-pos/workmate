import type { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { BlockStack, Box, Card, Checkbox, Select, Text } from '@shopify/polaris';

export function WorkOrderRequestSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;
}) {
  return (
    <>
      <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Work Order Requests
          </Text>
        </BlockStack>
      </Box>
      <Card roundedAbove="sm">
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
      </Card>
    </>
  );
}
