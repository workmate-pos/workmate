import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { useSerialsQuery } from '@work-orders/common/queries/use-serials-query.js';
import { Route, UseRouter } from '../router.js';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { getSubtitle } from '../../util/subtitle.js';
import { ListPopup } from '../ListPopup.js';
import { DetailedSerial } from '@web/services/serials/get.js';
import { useState } from 'react';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { LocationSelectorProps } from './LocationSelector.js';
import { CustomerSelectorProps } from './CustomerSelector.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import {
  useProductVariantQueries,
  useProductVariantQuery,
} from '@work-orders/common/queries/use-product-variant-query.js';
import { ProductVariantSelectorProps } from './ProductVariantSelector.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { Button } from '@shopify/ui-extensions-react/point-of-sale';

export type SerialSelectorProps = {
  onSelect: (serial: DetailedSerial) => void;
  onClear?: () => void;
  initialLocationId?: ID;
  initialCustomerId?: ID;
  initialProductVariantId?: ID;
  useRouter: UseRouter<{
    LocationSelector: Route<LocationSelectorProps>;
    CustomerSelector: Route<CustomerSelectorProps>;
    ProductVariantSelector: Route<ProductVariantSelectorProps>;
  }>;
};

export function SerialSelector({
  onSelect,
  onClear,
  useRouter,
  initialProductVariantId,
  initialCustomerId,
  initialLocationId,
}: SerialSelectorProps) {
  const [query, setQuery] = useDebouncedState('');
  const [locationId, setLocationId] = useState(initialLocationId);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [productVariantId, setProductVariantId] = useState(initialProductVariantId);

  const fetch = useAuthenticatedFetch();
  const locationQuery = useLocationQuery({ fetch, id: locationId ?? null });
  const customerQuery = useCustomerQuery({ fetch, id: customerId ?? null });
  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId ?? null });
  const serialsQuery = useSerialsQuery({
    fetch,
    params: {
      limit: 25,
      query,
      locationId,
      customerId,
      sort: 'created-at',
      order: 'descending',
    },
  });

  const serials = serialsQuery.data?.pages.flat() ?? [];

  const productVariantIds = unique(serials.map(serial => serial.productVariant.id));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const router = useRouter();

  return (
    <ListPopup
      title={'Select serial'}
      imageDisplayStrategy="always"
      query={{ query, setQuery }}
      resourceName={{ singular: 'serial', plural: 'serials' }}
      isLoadingMore={serialsQuery.isFetching}
      onEndReached={() => serialsQuery.fetchNextPage()}
      selection={{
        type: 'select',
        items: [
          onClear ? { id: '', leftSide: { label: 'Clear' } } : null,
          ...serials.map(serial => getSerialItem(serial, productVariantQueries[serial.productVariant.id]?.data)),
        ].filter(isNonNullable),
        onSelect: serialId =>
          serialId === ''
            ? onClear?.()
            : onSelect(serials.find(serial => getSerialItem(serial).id === serialId) ?? never()),
        actions: [
          {
            position: 'top',
            title: [
              'Location',
              locationQuery.isLoading ? '(loading...)' : null,
              locationQuery.data ? `(${locationQuery.data.name})` : null,
              locationQuery.isError ? '(error loading location)' : null,
            ]
              .filter(isNonNullable)
              .join(' '),
            onAction: () =>
              router.push('LocationSelector', {
                onClear: () => setLocationId(undefined),
                onSelect: location => setLocationId(location.id),
                useRouter,
              }),
          },
          {
            position: 'top',
            title: [
              'Customer',
              customerQuery.isLoading ? '(loading...)' : null,
              customerQuery.data ? `(${customerQuery.data.displayName})` : null,
              customerQuery.isError ? '(error loading customer)' : null,
            ]
              .filter(isNonNullable)
              .join(''),
            onAction: () =>
              router.push('CustomerSelector', {
                onClear: () => setCustomerId(undefined),
                onSelect: customer => setCustomerId(customer.id),
                useRouter,
              }),
          },
          {
            position: 'top',
            title: [
              'Product',
              productVariantQuery.isLoading ? '(loading...)' : null,
              productVariantQuery.data
                ? `(${getProductVariantName(productVariantQuery.data) ?? 'unknown product'})`
                : null,
              productVariantQuery.isError ? '(error loading product)' : null,
            ]
              .filter(isNonNullable)
              .join(' '),
            onAction: () =>
              router.push('ProductVariantSelector', {
                onSelect: productVariant => setProductVariantId(productVariant.id),
                header: <Button title="Clear" onPress={() => setProductVariantId(undefined)} type="plain" />,
                useRouter,
              }),
          },
        ],
      }}
      useRouter={useRouter}
    />
  );
}

export function getSerialItem(serial: DetailedSerial, productVariant?: ProductVariant | undefined | null) {
  return {
    id: `${serial.productVariant.id}-${serial.serial}`,
    leftSide: {
      label: getProductVariantName(productVariant ?? serial.productVariant) ?? 'Unknown product',
      subtitle: getSubtitle([serial.serial]),
      badges: [serial.location ? ({ variant: 'highlight', text: serial.location.name } as const) : null].filter(
        isNonNullable,
      ),
      image: {
        source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
      },
    },
  };
}
