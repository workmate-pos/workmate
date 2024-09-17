import { ScrollView, Text } from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';

export function WorkOrderItemSourcingHelp() {
  return (
    <ScrollView>
      <ResponsiveStack direction={'vertical'} paddingVertical={'Medium'} spacing={1}>
        <Text variant={'headingLarge'}>Work Order Sourcing</Text>

        <Text variant={'body'}>
          Work order line items may be sourced from purchase orders, transfer orders, or directly from store location
          inventory. Inventory can be reserved to a work order line item through the sourcing tab. If the current
          location does not have sufficient inventory, additional inventory can be ordered through transfer orders and
          purchase orders. Purchase orders source from external suppliers, while transfer orders source from other store
          locations.
        </Text>
      </ResponsiveStack>
    </ScrollView>
  );
}
