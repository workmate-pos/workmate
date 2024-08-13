import { ScrollView, Text } from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';

export function WorkOrderItemFulfillmentHelp() {
  return (
    <ScrollView>
      <ResponsiveStack direction={'vertical'} paddingVertical={'Medium'} spacing={1}>
        <Text variant={'headingLarge'}>Work Order Fulfillment</Text>
      </ResponsiveStack>

      <Text variant={'body'} color={'TextNeutral'}>
        Work order line items may be sourced from purchase orders, transfer orders, or directly from store location
        inventory. Inventory is committed to a work order line item by creating a shopify order for that line item,
        either by checking out through POS or by creating an unpaid order through WorkMate. If the current location does
        not have sufficient inventory, additional inventory can be ordered through purchase orders and transfers orders.
        Purchase orders source from external suppliers, while transfer orders source from other store locations.
      </Text>
    </ScrollView>
  );
}
