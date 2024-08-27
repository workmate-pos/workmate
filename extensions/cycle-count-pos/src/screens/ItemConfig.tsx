import { CreateCycleCountItem } from '@web/schemas/generated/create-cycle-count.js';
import { useState } from 'react';
import { useRouter } from '../routes.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { Badge, Button, ScrollView, Stepper, Text } from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { getCycleCountApplicationStateBadge } from './Entry.js';
import { useCycleCountQuery } from '@work-orders/common/queries/use-cycle-count-query.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';

export function ItemConfig({
  name,
  item,
  onRemove,
  onSave,
}: {
  name: string | null;
  item: CreateCycleCountItem;
  onSave: (item: { quantity: number }) => void;
  onRemove: () => void;
}) {
  const [quantity, setQuantity] = useState(item.countQuantity);

  const screen = useScreen();
  const router = useRouter();

  const fetch = useAuthenticatedFetch();
  const cycleCountQuery = useCycleCountQuery({ fetch, name });
  const productVariantQuery = useProductVariantQuery({ fetch, id: item.productVariantId });
  const productVariant = productVariantQuery.data;

  const label =
    getProductVariantName(
      productVariant ?? {
        title: item.productVariantTitle,
        product: { title: item.productTitle, hasOnlyDefaultVariant: false },
      },
    ) ?? 'Unknown Product';

  const cycleCountItem = cycleCountQuery.data?.items.find(hasPropertyValue('uuid', item.uuid));

  screen.setTitle(label);

  return (
    <ScrollView>
      <ResponsiveStack direction={'vertical'} spacing={2}>
        <ResponsiveStack
          direction={'horizontal'}
          alignment={'space-between'}
          paddingVertical={'ExtraLarge'}
          flexWrap={'wrap'}
        >
          <Text variant={'headingLarge'}>{label}</Text>
          <Badge {...getCycleCountApplicationStateBadge(cycleCountItem?.applicationStatus ?? 'NOT_APPLIED')} />
        </ResponsiveStack>

        <ResponsiveStack direction={'vertical'} alignment={'center'} spacing={0.5}>
          <Text variant={'headingSmall'} color={'TextSubdued'}>
            Quantity
          </Text>
          <Stepper minimumValue={0} initialValue={quantity} value={quantity} onValueChanged={setQuantity} />
        </ResponsiveStack>

        <ResponsiveStack direction={'vertical'} alignment={'center'} spacing={0.5}>
          <Button
            title={'Remove'}
            type={'destructive'}
            onPress={() => {
              onRemove();
              router.popCurrent();
            }}
          />
          <Button
            title={'Save'}
            onPress={() => {
              onSave({ quantity });
              router.popCurrent();
            }}
          />
        </ResponsiveStack>
      </ResponsiveStack>
    </ScrollView>
  );
}
