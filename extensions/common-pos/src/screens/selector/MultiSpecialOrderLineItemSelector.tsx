import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { UseRouter } from '../router.js';
import { ListPopup, MultiSelectListPopupAction } from '../ListPopup.js';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { OrderState, SpecialOrderPaginationOptions } from '@web/schemas/generated/special-order-pagination-options.js';
import { getSpecialOrderLineItemBadges } from '../../util/special-orders.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { UUID } from '@work-orders/common/util/uuid.js';

export type MultiSpecialOrderLineItemSelectorProps = {
  name: string;
  onSelect?: (lineItems: DetailedSpecialOrder['lineItems']) => void;
  actions?: MultiSelectListPopupAction<DetailedSpecialOrder['lineItems'][number]>[];
  initialSelection?: UUID[];
  useRouter: UseRouter;
  options?: {
    /**
     * Filters to apply to the line items.
     * Filtered line items will be shown as disabled.
     */
    filters?: {
      vendorName?: string;
      state?: OrderState;
    };
    quantityBadge?: 'LINE_ITEM_QUANTITY' | 'UNORDERED_QUANTITY';
  };
};

export function MultiSpecialOrderLineItemSelector({
  onSelect,
  name,
  initialSelection,
  useRouter,
  options,
  actions,
}: MultiSpecialOrderLineItemSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');

  const specialOrderQuery = useSpecialOrderQuery({ fetch, name });
  const specialOrder = specialOrderQuery.data;

  const lineItems = specialOrderQuery.data?.lineItems ?? [];
  const productVariantIds = unique(lineItems.map(lineItem => lineItem.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const filteredLineItems = lineItems.filter(
    lineItem =>
      !query ||
      !productVariantQueries[lineItem.productVariantId]?.data ||
      getProductVariantName(productVariantQueries[lineItem.productVariantId]?.data)
        ?.toLowerCase()
        .includes(query.toLowerCase()),
  );

  const quantityBadge = options?.quantityBadge ?? 'LINE_ITEM_QUANTITY';

  const getLineItemsByUuids = (uuids: UUID[]) =>
    uuids.map(uuid => filteredLineItems.find(lineItem => lineItem.uuid === uuid) ?? never());

  return (
    <ListPopup<UUID>
      title={`Select ${name} Line Items`}
      query={{ query, setQuery }}
      resourceName={{ singular: 'line item', plural: 'line items' }}
      isLoadingMore={specialOrderQuery.isFetching}
      imageDisplayStrategy={'always'}
      selection={{
        type: 'multi-select',
        onSelect: lineItemUuids => onSelect?.(getLineItemsByUuids(lineItemUuids)),
        initialSelection,
        actions: actions?.map(action => {
          return {
            ...action,
            onAction: lineItemUuids => action.onAction(getLineItemsByUuids(lineItemUuids)),
          };
        }),
        items: filteredLineItems.map(lineItem => {
          const productVariantQuery = productVariantQueries[lineItem.productVariantId];
          const productVariant = productVariantQuery?.data;

          const label = productVariantQuery?.isLoading
            ? 'Loading...'
            : (getProductVariantName(productVariant) ?? 'Unknown item');

          const purchaseOrderQuantity = sum(lineItem.purchaseOrderLineItems.map(lineItem => lineItem.quantity));

          const badge = {
            LINE_ITEM_QUANTITY: lineItem.quantity,
            UNORDERED_QUANTITY: Math.max(0, lineItem.quantity - purchaseOrderQuantity),
          }[quantityBadge];

          const orderState: OrderState =
            purchaseOrderQuantity >= lineItem.quantity ? 'fully-ordered' : 'not-fully-ordered';

          const disabled = [
            options?.filters?.vendorName !== undefined && productVariant?.product.vendor !== options.filters.vendorName,
            options?.filters?.state !== undefined && orderState !== options.filters.state,
          ].some(Boolean);

          return {
            id: lineItem.uuid,
            leftSide: {
              label,
              image: {
                source: productVariantQuery?.data?.image?.url ?? productVariantQuery?.data?.product?.featuredImage?.url,
                badge,
              },
              badges: specialOrder ? getSpecialOrderLineItemBadges(specialOrder, lineItem) : undefined,
            },
            disabled,
          };
        }),
      }}
      useRouter={useRouter}
    />
  );
}
