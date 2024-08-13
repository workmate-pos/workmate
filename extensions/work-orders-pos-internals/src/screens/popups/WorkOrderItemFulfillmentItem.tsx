import { DetailedWorkOrderItem } from '@web/services/work-orders/types.js';
import { ScrollView, Text } from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { match } from 'ts-pattern';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { PlanItem } from './WorkOrderItemFulfillment.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';

export function WorkOrderItemFulfillmentItem({
  item,
  plan,
  onSave,
}: {
  item: DetailedWorkOrderItem;
  plan: PlanItem[];
  onSave: (plans: PlanItem[]) => void;
}) {
  const itemPlans = plan.filter(hasPropertyValue('uuid', item.uuid));

  const fetch = useAuthenticatedFetch();
  const productVariantId = match(item)
    .with({ type: 'product' }, item => item.productVariantId)
    .otherwise(() => null);
  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId });

  const name = match(item)
    .with({ type: 'product' }, item => {
      if (productVariantQuery.isLoading) {
        return 'Loading...';
      }

      if (productVariantQuery.isError) {
        return 'Error loading product';
      }

      const productVariant = productVariantQuery.data;
      return getProductVariantName(productVariant) ?? 'Unknown product';
    })
    .with({ type: 'custom-item' }, item => item.name)
    .exhaustive();

  // TODO: Overview of the same stuff as the list item
  // TODO: Ability to create a purchase order / transfer order / shopify order
  // TODO: Make this all async - i.e. have the option in the list to create everything & show a plan

  return (
    <ScrollView>
      <ResponsiveStack direction={'vertical'} paddingVertical={'Medium'} spacing={1}>
        <Text variant={'headingLarge'}>{name}</Text>
      </ResponsiveStack>
    </ScrollView>
  );
}
