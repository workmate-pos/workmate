import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { UseRouter } from '../router.js';
import { useState } from 'react';
import { ListPopup } from '../ListPopup.js';
import { useSerialsQuery } from '@work-orders/common/queries/use-serials-query.js';
import { useDebouncedState } from '../../hooks/use-debounced-state.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { BadgeProps } from '@shopify/ui-extensions/point-of-sale';

export type ProductVariantSerialSelectorProps = {
  onSelect: (serial: string, productVariantId: ID) => void;
  useRouter: UseRouter;
  filters?: {
    productVariantId?: ID;
    locationId?: ID;
    customerId?: ID;
    /**
     * If undefined, all serials will be shown.
     * If true, only sold serials will be shown.
     * If false, only unsold serials will be shown.
     *
     * In all cases, sold serials are shown last.
     * Serial status is shown in a badge.
     */
    sold?: boolean;
  };
};

export function ProductVariantSerialSelector({ useRouter, onSelect, filters }: ProductVariantSerialSelectorProps) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useDebouncedState('');

  const [sold, setSold] = useState(filters?.sold);

  const productVariantSerialsQuery = useSerialsQuery({
    fetch,
    params: {
      query,
      productVariantId: filters?.productVariantId,
      locationId: filters?.locationId,
      customerId: filters?.customerId,
      sold,
      limit: 100,
    },
  });

  const [pageNumber, setPageNumber] = useState(1);

  const allPages = productVariantSerialsQuery.data?.pages.flat() ?? [];
  const page = productVariantSerialsQuery.data?.pages[pageNumber - 1] ?? [];

  const productVariantIds = unique(allPages.map(serial => serial.productVariant.id));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  return (
    <ListPopup
      title="Select serial"
      query={{ query, setQuery }}
      useRouter={useRouter}
      resourceName={{ singular: 'serial', plural: 'serials' }}
      pagination={{
        page: pageNumber,
        onPageChange: setPageNumber,
        onFetchNextPage: () => productVariantSerialsQuery.fetchNextPage(),
        hasNextPage: productVariantSerialsQuery.hasNextPage,
        pageCount: productVariantSerialsQuery.data?.pages.length ?? 0,
      }}
      isLoadingMore={productVariantSerialsQuery.isFetchingNextPage}
      imageDisplayStrategy="always"
      selection={{
        type: 'select',
        onSelect: id => {
          const { productVariantId, serial } = fromId(id);
          onSelect(serial, productVariantId);
        },
        items: page.map(serial => {
          const productVariantQuery = productVariantQueries[serial.productVariant.id];
          const productVariant = productVariantQuery?.data;
          const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;

          return {
            id: toId(serial.productVariant.id, serial.serial),
            leftSide: {
              label: getProductVariantName(productVariant ?? serial.productVariant) ?? 'Unknown product variant',
              image: { source: imageUrl },
              badges: [serial.sold ? serialSoldBadge : serialAvailableBadge],
            },
          };
        }),
        actions: [
          {
            type: 'plain',
            position: 'top',
            title: sold !== false ? 'Showing sold serials' : 'Not showing sold serials',
            onAction: () => {
              const showSoldSerials = !sold;
              if (showSoldSerials) {
                setSold(undefined);
              } else {
                // if filters has a default falsy value we fall back to that (either undefined or false)
                setSold(!filters?.sold ? filters?.sold : false);
              }
            },
          },
        ],
      }}
    />
  );
}

function toId(productVariantId: ID, serial: string) {
  return JSON.stringify({ productVariantId, serial });
}

function fromId(id: string) {
  return JSON.parse(id) as { productVariantId: ID; serial: string };
}

const serialSoldBadge: BadgeProps = {
  text: 'Sold',
  variant: 'critical',
};

const serialAvailableBadge: BadgeProps = {
  text: 'Available',
  variant: 'success',
};
