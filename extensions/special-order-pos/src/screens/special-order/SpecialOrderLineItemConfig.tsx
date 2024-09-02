import { CreateSpecialOrder } from '@web/schemas/generated/create-special-order.js';
import { useState } from 'react';
import { Badge, BadgeProps, Banner, Button, ScrollView, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { sum } from '@teifi-digital/shopify-app-toolbox/array';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { useRouter } from '../../routes.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { getSpecialOrderLineItemBadges } from '@work-orders/common-pos/util/special-orders.js';

export function SpecialOrderLineItemConfig({
  name,
  lineItem: initialLineItem,
  onChange,
  onRemove,
}: {
  name: CreateSpecialOrder['name'];
  lineItem: CreateSpecialOrder['lineItems'][number];
  onChange: (lineItem: CreateSpecialOrder['lineItems'][number]) => void;
  onRemove: () => void;
}) {
  const [lineItem, setLineItem] = useState(initialLineItem);

  const fetch = useAuthenticatedFetch();

  const specialOrderQuery = useSpecialOrderQuery({ fetch, name });
  const specialOrder = specialOrderQuery.data;

  const specialOrderLineItem = specialOrder?.lineItems.find(hasPropertyValue('uuid', lineItem.uuid));

  const productVariantQuery = useProductVariantQuery({ fetch, id: lineItem.productVariantId });
  const productVariant = productVariantQuery.data;

  const title = productVariantQuery.isLoading
    ? 'Line item'
    : getProductVariantName(productVariant) ?? 'Unknown product' ?? 'Loading...';

  const screen = useScreen();
  screen.setTitle(title);
  screen.setIsLoading(specialOrderQuery.isFetching || productVariantQuery.isLoading);

  const router = useRouter();

  return (
    <ScrollView>
      <ResponsiveGrid columns={1} spacing={2}>
        {specialOrderQuery.isError && (
          <Banner
            title={`Error loading special order: ${extractErrorMessage(specialOrderQuery.error, 'unknown error')}`}
            variant={'error'}
            visible
            action={'Retry'}
            onPress={() => specialOrderQuery.refetch()}
          />
        )}

        {productVariantQuery.isError && (
          <Banner
            title={`Error loading product: ${extractErrorMessage(productVariantQuery.error, 'unknown error')}`}
            variant={'error'}
            visible
            action={'Retry'}
            onPress={() => productVariantQuery.refetch()}
          />
        )}

        {lineItem.shopifyOrderLineItem === null && (
          <Banner
            title={'This line item is not linked to an order, likely because the order was deleted'}
            variant={'alert'}
            visible
            hideAction
          />
        )}

        <Text variant={'headingLarge'}>{title}</Text>

        {!!specialOrder && !!specialOrderLineItem && (
          <ResponsiveStack direction={'horizontal'} flexWrap={'wrap'}>
            {getSpecialOrderLineItemBadges(specialOrder, specialOrderLineItem).map(badge => (
              <Badge key={badge.text} {...badge} />
            ))}
          </ResponsiveStack>
        )}

        <Text variant={'headingSmall'} color={'TextSubdued'}>
          Quantity
        </Text>
        <Stepper
          minimumValue={Math.max(
            1,
            sum(specialOrderLineItem?.purchaseOrderLineItems.map(lineItem => lineItem.quantity) ?? []),
          )}
          maximumValue={specialOrderLineItem?.shopifyOrderLineItem?.quantity}
          initialValue={lineItem.quantity}
          value={lineItem.quantity}
          onValueChanged={(quantity: number) => setLineItem({ ...lineItem, quantity })}
        />

        <Button
          title={'Remove'}
          type={'destructive'}
          isDisabled={!!specialOrderLineItem?.purchaseOrderLineItems?.length}
          onPress={() => {
            onRemove();
            router.popCurrent();
          }}
        />
        <Button
          title={'Save'}
          type={'primary'}
          onPress={() => {
            onChange(lineItem);
            router.popCurrent();
          }}
        />
      </ResponsiveGrid>
    </ScrollView>
  );
}
