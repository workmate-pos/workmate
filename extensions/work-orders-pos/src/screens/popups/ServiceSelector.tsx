import { List, ListRow, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ProductVariant, useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { uuid } from '../../util/uuid.js';
import { Int } from '@web/schemas/generated/create-work-order.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useServiceCollectionIds } from '../../hooks/use-service-collection-ids.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { CreateWorkOrderCharge, CreateWorkOrderItem } from '../../types.js';
import { productVariantDefaultChargeToCreateWorkOrderCharge } from '../../dto/product-variant-default-charges.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getTotalPriceForCharges } from '../../create-work-order/charges.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';
import { useRouter } from '../../routes.js';

type OnSelect = (arg: {
  type: 'mutable-service' | 'fixed-service';
  item: CreateWorkOrderItem;
  charges: CreateWorkOrderCharge[];
}) => void;

export function ServiceSelector({ onSelect }: { onSelect: OnSelect }) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();
  const serviceCollectionIds = useServiceCollectionIds();
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      query: serviceCollectionIds
        ? `${query} AND (${serviceCollectionIds.map(id => `collection:${parseGid(id).id}`).join(' OR ')})`
        : query,
    },
  });
  const currencyFormatter = useCurrencyFormatter();

  const rows = getProductVariantRows(productVariantsQuery?.data?.pages.flat() ?? [], onSelect, currencyFormatter);

  return (
    <ScrollView>
      <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {productVariantsQuery.isRefetching ? 'Reloading...' : ' '}
        </Text>
      </Stack>
      <ControlledSearchBar
        value={query}
        onTextChange={(query: string) => setQuery(query)}
        onSearch={() => {}}
        placeholder={'Search services'}
      />
      <List data={rows} imageDisplayStrategy={'always'} />
      {productVariantsQuery.isLoading && (
        <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            Loading services...
          </Text>
        </Stack>
      )}
      {productVariantsQuery.isSuccess && rows.length === 0 && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No services found
          </Text>
        </Stack>
      )}
      {productVariantsQuery.isError && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(productVariantsQuery.error, 'Error loading services')}
          </Text>
        </Stack>
      )}
    </ScrollView>
  );
}

function getProductVariantRows(
  productVariants: ProductVariant[],
  onSelect: OnSelect,
  currencyFormatter: ReturnType<typeof useCurrencyFormatter>,
): ListRow[] {
  const router = useRouter();

  return productVariants
    .map<ListRow | null>(variant => {
      const displayName = getProductVariantName(variant) ?? 'Unknown service';

      const imageUrl = variant.image?.url ?? variant.product.featuredImage?.url;

      const type = variant.product.isFixedServiceItem
        ? 'fixed-service'
        : variant.product.isMutableServiceItem
          ? 'mutable-service'
          : null;

      if (type === null) {
        return null;
      }

      const defaultCharges = variant.defaultCharges.map(productVariantDefaultChargeToCreateWorkOrderCharge);

      let label: string | undefined = undefined;

      if (variant.product.isMutableServiceItem) {
        if (defaultCharges) {
          label = currencyFormatter(getTotalPriceForCharges(defaultCharges));
        }
      } else {
        label = currencyFormatter(variant.price);
      }

      return {
        id: variant.id,
        onPress: async () => {
          const itemUuid = uuid();

          await router.popCurrent();

          onSelect({
            type,
            item: {
              uuid: itemUuid,
              productVariantId: variant.id,
              quantity: 1 as Int,
              absorbCharges: variant.product.isMutableServiceItem,
            },
            charges: defaultCharges.map<CreateWorkOrderCharge>(charge => ({
              ...charge,
              uuid: uuid(),
              workOrderItemUuid: itemUuid,
            })),
          });
        },
        leftSide: {
          label: displayName,
          subtitle: variant.product.description ? [variant.product.description] : undefined,
          image: { source: imageUrl },
        },
        rightSide: {
          showChevron: true,
          label,
        },
      };
    })
    .filter(isNonNullable);
}
