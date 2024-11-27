import { ListPopup } from '@work-orders/common-pos/screens/ListPopup.js';
import { useRouter } from '../../routes.js';
import { useEffect, useState } from 'react';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useSpecialOrdersQuery } from '@work-orders/common/queries/use-special-orders-query.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import {
  getDetailedSpecialOrderBadges,
  getDetailedSpecialOrderSubtitle,
} from '@work-orders/common-pos/util/special-orders.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { Banner, ScrollView, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { usePurchaseOrderMutation } from '@work-orders/common/queries/use-purchase-order-mutation.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { uuid } from '@work-orders/common/util/uuid.js';

export function CreatePurchaseOrderSpecialOrderSelector() {
  const { session, toast } = useApi<'pos.home.modal.render'>();

  const [locationId, setLocationId] = useState<ID>(createGid('Location', session.currentSession.locationId));
  const [vendorName, setVendorName] = useState<string>();
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();
  const locationQuery = useLocationQuery({ fetch, id: locationId ?? null });
  const location = locationQuery.data;

  const settingsQuery = useSettingsQuery({ fetch });
  const purchaseOrderCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'PURCHASE_ORDER' });
  const lineItemCustomFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'LINE_ITEM' });

  const screen = useScreen();
  screen.setIsLoading(
    settingsQuery.isLoading ||
      purchaseOrderCustomFieldsPresetsQuery.isLoading ||
      lineItemCustomFieldsPresetsQuery.isLoading,
  );

  const specialOrdersQuery = useSpecialOrdersQuery({
    fetch,
    params: {
      query,
      locationId,
      lineItemVendorName: [vendorName].filter(isNonNullable),
      lineItemOrderState: 'not-fully-ordered',
      limit: 25,
    },
    options: {
      enabled: !!locationId && !!vendorName,
    },
  });

  const purchaseOrderMutation = usePurchaseOrderMutation({ fetch });

  const [selectedSpecialOrders, setSelectedSpecialOrders] = useState<DetailedSpecialOrder[]>([]);
  const specialOrders = specialOrdersQuery.data?.pages.flat() ?? [];

  useEffect(() => {
    setSelectedSpecialOrders([]);
  }, [locationId, vendorName]);

  const productVariantIds = unique(
    selectedSpecialOrders.flatMap(specialOrder => specialOrder.lineItems).map(lineItem => lineItem.productVariantId),
  );
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });
  const isLoadingProductVariants = Object.values(productVariantQueries).some(query => query.isLoading);
  const errorProductVariantQueries = Object.values(productVariantQueries).filter(query => query.isError);

  const router = useRouter();

  return (
    <Form disabled={purchaseOrderMutation.isPending || !router.isCurrent}>
      <ScrollView>
        <FormStringField
          label={'Location'}
          value={!locationId ? '' : locationQuery.isLoading ? 'Loading...' : (location?.name ?? 'Unknown location')}
          onFocus={() => router.push('LocationSelector', { onSelect: location => setLocationId(location.id) })}
          required
        />

        <FormStringField
          label={'Vendor'}
          value={vendorName}
          onFocus={() =>
            router.push('NotFullyOrderedSpecialOrderVendorSelector', {
              locationId,
              onSelect: vendor => setVendorName(vendor),
            })
          }
          required
        />

        {!!locationId && !!vendorName && (
          <ListPopup
            title={'Select special orders'}
            useRouter={useRouter}
            query={{ query, setQuery }}
            isLoadingMore={specialOrdersQuery.isFetching}
            onEndReached={() => specialOrdersQuery.fetchNextPage()}
            selection={{
              type: 'multi-select',
              initialSelection: selectedSpecialOrders.map(specialOrder => specialOrder.name),
              items: specialOrders.map(specialOrder => ({
                id: specialOrder.name,
                leftSide: {
                  label: specialOrder.name,
                  badges: getDetailedSpecialOrderBadges(specialOrder),
                  subtitle: getDetailedSpecialOrderSubtitle(specialOrder),
                },
              })),
              onSelect: specialOrderNames =>
                setSelectedSpecialOrders(specialOrders.filter(item => specialOrderNames.includes(item.name))),
            }}
          />
        )}

        <ResponsiveStack direction={'vertical'} paddingVertical={'ExtraLarge'} spacing={2}>
          {errorProductVariantQueries.length > 0 && (
            <Banner
              title={`Error loading products: ${errorProductVariantQueries.reduce(
                (acc, value) => extractErrorMessage(value.error, acc),
                'unknown error',
              )}`}
              variant={'error'}
              visible
              action={'Retry'}
              onPress={() => errorProductVariantQueries.forEach(query => query.refetch())}
            />
          )}

          <FormButton
            title={'Create purchase order'}
            type={'primary'}
            loading={purchaseOrderMutation.isPending || isLoadingProductVariants}
            disabled={selectedSpecialOrders.length === 0 || isLoadingProductVariants}
            onPress={() => {
              if (!locationId) {
                toast.show('You must select a location to create a purchase order');
                return;
              }

              if (!selectedSpecialOrders.length) {
                toast.show('You must select at least one special order');
                return;
              }

              if (!vendorName) {
                toast.show('You must select a vendor');
                return;
              }

              const status = settingsQuery.data?.settings.purchaseOrders.defaultStatus;

              if (!status) {
                toast.show('Please wait for the default purchase order status to load');
                return;
              }

              const purchaseOrderCustomFields = purchaseOrderCustomFieldsPresetsQuery.data?.defaultCustomFields;

              if (!purchaseOrderCustomFields) {
                toast.show('Please wait for the default custom fields to load');
                return;
              }

              const lineItemCustomFields = lineItemCustomFieldsPresetsQuery.data?.defaultCustomFields;

              if (!lineItemCustomFields) {
                toast.show('Please wait for the default custom fields to load');
                return;
              }

              const createPurchaseOrder: CreatePurchaseOrder = {
                name: null,
                type: 'NORMAL',
                // TODO: Fix this
                supplierId: null,
                status,
                placedDate: null,
                locationId,
                shipFrom: '',
                shipTo: location?.address?.formatted.join('\n') ?? '',
                note: '',
                discount: null,
                tax: null,
                shipping: null,
                deposited: null,
                paid: null,
                customFields: purchaseOrderCustomFields,
                employeeAssignments: [],
                lineItems: selectedSpecialOrders.flatMap(specialOrder =>
                  specialOrder.lineItems
                    .map(lineItem => {
                      const productVariant = productVariantQueries[lineItem.productVariantId]?.data;

                      if (!productVariant) {
                        toast.show('Product variant not found');
                        throw new Error('Product variant not found');
                      }

                      if (productVariant.product.vendor !== vendorName) {
                        return null;
                      }

                      const inventoryItem = productVariant.inventoryItem;

                      const unitCost = inventoryItem.unitCost
                        ? BigDecimal.fromDecimal(inventoryItem.unitCost.amount).toMoney()
                        : BigDecimal.ZERO.toMoney();

                      return {
                        uuid: uuid(),
                        productVariantId: lineItem.productVariantId,
                        specialOrderLineItem: {
                          name: specialOrder.name,
                          uuid: lineItem.uuid,
                        },
                        quantity: lineItem.quantity,
                        unitCost,
                        customFields: lineItemCustomFields,
                        serialNumber: null,
                      } satisfies CreatePurchaseOrder['lineItems'][number];
                    })
                    .filter(isNonNullable),
                ),
              };

              router.push('PurchaseOrder', { initial: createPurchaseOrder });

              // return purchaseOrderMutation.mutate(createPurchaseOrder, {
              //   async onSuccess({ purchaseOrder }) {
              //     toast.show(`Created purchase order ${purchaseOrder.name}`);
              //     await router.popCurrent();
              //     router.push('PurchaseOrder', {
              //       initial: createPurchaseOrderFromPurchaseOrder(purchaseOrder),
              //     });
              //   },
              // });
            }}
          />
        </ResponsiveStack>
      </ScrollView>
    </Form>
  );
}
