import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { BlockStack, Filters, InlineStack, Modal, ResourceItem, ResourceList, Text, Thumbnail } from '@shopify/polaris';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useProductVariantsQuery } from '@work-orders/common/queries/use-product-variants-query.js';
import { useEffect, useState } from 'react';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { Int } from '@web/schemas/generated/create-purchase-order.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import {
  getProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
  SERVICE_METAFIELD_VALUE_TAG_NAME,
} from '@work-orders/common/metafields/product-service-type.js';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';
import { productVariantDefaultChargeToCreateWorkOrderCharge } from '@work-orders/common/create-work-order/product-variant-default-charges.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { uuid } from '@work-orders/common/util/uuid.js';

type AddProductModalProps = {
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
  /**
   * Optional location filter. Will also display inventory quantity if set.
   */
  locationId?: ID;
  /**
   * Product type filter, workmate specific.
   */
  productType: 'PRODUCT' | 'SERVICE';
  /**
   * Company location id. If set, will filter by their catalogs and prices.
   */
  companyLocationId?: ID | null;
  onAdd: (products: CreateWorkOrder['items'][number][], charges: CreateWorkOrder['charges'][number][]) => void;
};

/**
 * Simple list of products to select from
 */
export function AddProductModal({
  open,
  onClose,
  onAdd,
  setToastAction,
  locationId,
  productType,
  companyLocationId,
}: AddProductModalProps) {
  const [page, setPage] = useState(0);
  const [query, setQuery, optimisticQuery] = useDebouncedState('');

  const app = useAppBridge();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const locationQuery = useLocationQuery({ fetch, id: locationId! }, { enabled: !!locationId });

  const locationIdQuery = locationId ? `location_id:${parseGid(locationId).id}` : undefined;
  const productStatusQuery = 'product_status:active';
  const productTypeQueries = {
    PRODUCT: Object.values(SERVICE_METAFIELD_VALUE_TAG_NAME)
      .map(tag => `tag_not:"${escapeQuotationMarks(tag)}"`)
      .join(' AND '),
    SERVICE: Object.values(SERVICE_METAFIELD_VALUE_TAG_NAME)
      .map(tag => `tag:"${escapeQuotationMarks(tag)}"`)
      .join(' OR '),
  }[productType];
  const productVariantsQuery = useProductVariantsQuery({
    fetch,
    params: {
      query: [query, productStatusQuery, locationIdQuery, productTypeQueries].filter(Boolean).join(' AND '),
    },
  });

  useEffect(() => {
    if (productVariantsQuery.data && productVariantsQuery.data.pages.length === 1) {
      // when we load from scratch we should reset the page count
      setPage(0);
    }
  }, [productVariantsQuery.data?.pages]);

  const allProductVariants =
    productVariantsQuery.data?.pages
      ?.flat()
      .flatMap(pv => [pv, ...pv.productVariantComponents.map(component => component.productVariant)]) ?? [];
  const inventoryItemIds = unique(allProductVariants.map(pv => pv.inventoryItem.id));
  const inventoryItemQueries = useInventoryItemQueries(
    { fetch, ids: inventoryItemIds, locationId: locationId! },
    { enabled: !!locationId },
  );

  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });
  const productVariants = productVariantsQuery.data?.pages?.[page] ?? [];

  const isLoading =
    locationQuery.isLoading ||
    productVariantsQuery.isLoading ||
    Object.values(inventoryItemQueries).some(query => query.isLoading);

  const isLastAvailablePage = productVariantsQuery.data && page === productVariantsQuery.data.pages.length - 1;
  const hasNextPage = !isLastAvailablePage || productVariantsQuery.hasNextPage;

  const thing = {
    PRODUCT: 'product',
    SERVICE: 'service',
  }[productType];

  const shouldShowPrice = companyLocationId === null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Add ${sentenceCase(thing).toLowerCase()}`}
        secondaryActions={[
          {
            content: 'Reload',
            onAction: () => productVariantsQuery.refetch(),
            loading: productVariantsQuery.isRefetching,
          },
          productType === 'SERVICE'
            ? {
                content: 'Create service',
                onAction: () => Redirect.create(app).dispatch(Redirect.Action.APP, '/service/new'),
              }
            : null,
          productType === 'PRODUCT'
            ? {
                content: 'Custom product',
                loading: !customFieldsPresetsQuery.data,
                onAction: () => {
                  if (!customFieldsPresetsQuery.data) {
                    return;
                  }

                  onAdd(
                    [
                      {
                        type: 'custom-item',
                        quantity: 1 as Int,
                        absorbCharges: false,
                        customFields: customFieldsPresetsQuery.data.defaultCustomFields,
                        uuid: uuid(),
                        name: 'Unnamed product',
                        unitPrice: BigDecimal.ONE.toMoney(),
                        serial: null,
                      },
                    ],
                    [],
                  );
                  onClose();
                },
              }
            : null,
        ].filter(isNonNullable)}
      >
        <ResourceList
          filterControl={
            <Filters
              filters={[]}
              queryPlaceholder={`Search ${thing}s`}
              queryValue={optimisticQuery}
              onQueryChange={setQuery}
              onQueryClear={() => setQuery('', true)}
              onClearAll={() => setQuery('', true)}
            />
          }
          items={productVariants}
          resolveItemId={item => item.id}
          renderItem={productVariant => {
            const name = getProductVariantName(productVariant) ?? `Unknown ${thing}`;
            const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;

            // the product variants to add. will be more than 1 if this PV is a bundle
            const productVariants = productVariant.requiresComponents
              ? productVariant.productVariantComponents
              : [{ productVariant, quantity: 1 as Int }];

            const totalPrice = (() => {
              return BigDecimal.sum(
                ...productVariants.map(pv => {
                  return BigDecimal.fromMoney(pv.productVariant.price).multiply(
                    BigDecimal.fromString(pv.quantity.toFixed(0)),
                  );
                }),
                ...productVariants.map(pv => {
                  return BigDecimal.fromMoney(
                    getTotalPriceForCharges(
                      pv.productVariant.defaultCharges?.map(productVariantDefaultChargeToCreateWorkOrderCharge),
                    ),
                  );
                }),
              ).toMoney();
            })();

            return (
              <ResourceItem
                id={productVariant.id}
                disabled={isLoading}
                onClick={() => {
                  if (isLoading) {
                    return;
                  }

                  if (!productVariants.length) {
                    return;
                  }

                  if (!customFieldsPresetsQuery.data) {
                    setToastAction({ content: 'Loading default custom fields... Try again momentarily' });
                    return;
                  }

                  const charges: CreateWorkOrder['charges'][number][] = [];
                  const items = productVariants.map(pv => {
                    const itemUuid = uuid();

                    for (const charge of pv.productVariant.defaultCharges) {
                      const defaultCharge = productVariantDefaultChargeToCreateWorkOrderCharge(charge);
                      charges.push({
                        ...defaultCharge,
                        uuid: uuid(),
                        workOrderItemUuid: itemUuid,
                      });
                    }

                    return {
                      type: 'product',
                      uuid: itemUuid,
                      productVariantId: pv.productVariant.id,
                      quantity: pv.quantity,
                      customFields: customFieldsPresetsQuery.data.defaultCustomFields,
                      absorbCharges:
                        getProductServiceType(pv.productVariant.product.serviceType?.value) ===
                        QUANTITY_ADJUSTING_SERVICE,
                      serial: null,
                    } as const;
                  });

                  onAdd(items, charges);

                  const thingMaybePlural = productVariants.length > 1 ? `${thing}s` : `${thing}`;
                  setToastAction({ content: `Added ${thingMaybePlural}` });
                }}
                name={name}
              >
                <BlockStack gap={'200'}>
                  <InlineStack align={'space-between'} blockAlign={'center'}>
                    <InlineStack gap={'400'}>{imageUrl && <Thumbnail alt={name} source={imageUrl} />}</InlineStack>
                    <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                      {shouldShowPrice && currencyFormatter(totalPrice)}
                    </Text>
                  </InlineStack>
                  <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                    {name}
                  </Text>
                  <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                    {productVariant.sku}
                  </Text>
                </BlockStack>
              </ResourceItem>
            );
          }}
          loading={isLoading}
          pagination={{
            hasNext: hasNextPage,
            hasPrevious: page > 0,
            onPrevious: () => setPage(page => page - 1),
            onNext: () => {
              if (isLastAvailablePage) {
                productVariantsQuery.fetchNextPage();
              }

              setPage(page => page + 1);
            },
          }}
        />
      </Modal>
    </>
  );
}
