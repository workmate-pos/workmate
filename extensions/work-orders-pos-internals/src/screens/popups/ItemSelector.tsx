import { useScreen } from '@teifi-digital/pos-tools/router';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useRouter } from '../../routes.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import {
  FIXED_PRICE_SERVICE,
  getProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
} from '@work-orders/common/metafields/product-service-type.js';
import { WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';

export type ItemFilter = 'can-add-labour';
type Item = WIPCreateWorkOrder['items'][number];

export function ItemSelector({
  items,
  onSelect,
  filter,
}: {
  items: Item[];
  onSelect: (item: Item) => void;
  filter?: ItemFilter | undefined;
}) {
  const productVariantIds = unique(items.map(li => li.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const screen = useScreen();
  screen.setIsLoading(Object.values(productVariantQueries).some(q => q.isLoading));

  const filterFn = (() => {
    if (filter === undefined) {
      return () => true;
    }

    if (filter === 'can-add-labour') {
      return (li: Item) =>
        getProductServiceType(productVariantQueries[li.productVariantId]?.data?.product?.serviceType?.value) !==
        FIXED_PRICE_SERVICE;
    }

    return filter satisfies never;
  })();

  const filteredItems = items.filter(filterFn);
  const rows = useItemRows(filteredItems, onSelect);

  return (
    <ScrollView>
      <List data={rows} imageDisplayStrategy={'always'} />
      {rows.length === 0 && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No items found
          </Text>
        </Stack>
      )}
    </ScrollView>
  );
}

// TODO: Central utility for creating work order item lists bcs we do it pretty often
function useItemRows(items: Item[], onSelect: (item: Item) => void): ListRow[] {
  const fetch = useAuthenticatedFetch();
  const router = useRouter();

  const productVariantIds = unique(items.map(li => li.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  return items
    .map<ListRow | null>(item => {
      const query = productVariantQueries[item.productVariantId];
      if (!query) return null;

      const variant = query.data;
      const displayName = getProductVariantName(variant) ?? 'Unknown item';
      const imageUrl = variant?.image?.url ?? variant?.product?.featuredImage?.url;
      const isMutableService =
        getProductServiceType(variant?.product?.serviceType?.value) === QUANTITY_ADJUSTING_SERVICE;

      return {
        id: item.uuid,
        onPress: async () => {
          await router.popCurrent();
          onSelect(item);
        },
        leftSide: {
          label: displayName,
          subtitle: variant?.sku ? [variant.sku] : undefined,
          image: {
            source: imageUrl,
            badge: isMutableService ? undefined : item.quantity,
          },
        },
        rightSide: {
          showChevron: true,
        },
      };
    })
    .filter(isNonNullable);
}
