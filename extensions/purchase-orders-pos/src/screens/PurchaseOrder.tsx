import {
  Button,
  List,
  ListRow,
  ScrollView,
  Stack,
  Text,
  TextArea,
  TextField,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { PopupNavigateFn, useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { ResponsiveGrid } from '@work-orders/common-pos/components/ResponsiveGrid.js';
import { useCreatePurchaseOrderReducer } from '../create-purchase-order/reducer.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { CreatePurchaseOrder, Product } from '@web/schemas/generated/create-purchase-order.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { useEffect, useState } from 'react';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useDialog } from '@work-orders/common-pos/providers/DialogProvider.js';
import { usePurchaseOrderMutation } from '@work-orders/common/queries/use-purchase-order-mutation.js';
import { defaultCreatePurchaseOrder } from '../create-purchase-order/default.js';

export function PurchaseOrder() {
  const [query, setQuery] = useState('');

  const [createPurchaseOrder, dispatch] = useCreatePurchaseOrderReducer();

  const { Screen, usePopup } = useScreen('PurchaseOrder', purchaseOrder => {
    setQuery('');
    dispatch.set({ purchaseOrder: purchaseOrder ?? defaultCreatePurchaseOrder });
  });

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const statusSelectorPopup = usePopup('StatusSelector', status => dispatch.setPartial({ status }));
  const productSelectorPopup = usePopup('ProductSelector', products => dispatch.addProducts({ products }));
  const productConfigPopup = usePopup('ProductConfig', product => dispatch.updateProduct({ product }));
  const locationSelectorPopup = usePopup('LocationSelector', location =>
    dispatch.setPartial({ locationId: location?.id ?? null, locationName: location?.name ?? null }),
  );
  const vendorSelectorPopup = usePopup('VendorSelector', vendor =>
    dispatch.setPartial({
      vendorCustomerId: vendor.customerId,
      vendorName: vendor.displayName,
      products: [],
    }),
  );
  const customFieldConfigPopup = usePopup('CustomFieldConfig', customFields => dispatch.setPartial({ customFields }));
  const employeeSelectorPopup = usePopup('EmployeeSelector', employeeAssignments =>
    dispatch.setPartial({ employeeAssignments }),
  );

  const vendorSelectorWarningDialog = useVendorChangeWarningDialog(createPurchaseOrder, vendorSelectorPopup.navigate);
  const selectVendorBeforeAddingProductsDialog = useSelectVendorBeforeAddingProductsDialog(
    createPurchaseOrder,
    vendorSelectorPopup.navigate,
    productSelectorPopup.navigate,
  );

  const productRows = useProductRows(createPurchaseOrder, query, productConfigPopup.navigate);

  const fetch = useAuthenticatedFetch();
  const purchaseOrderMutation = usePurchaseOrderMutation(
    { fetch },
    {
      onSuccess: ({ purchaseOrder }) => {
        const message = !!createPurchaseOrder.name ? 'Purchase order updated' : 'Purchase order created';
        toast.show(message);
        dispatch.set({ purchaseOrder });
      },
    },
  );

  const selectedLocationQuery = useLocationQuery({ fetch, id: createPurchaseOrder.locationId });
  const selectedLocation = selectedLocationQuery.data;

  // Default "Ship To" to selected location's address
  useEffect(() => {
    if (!selectedLocation) return;
    if (createPurchaseOrder.shipTo) return;
    dispatch.setPartial({ shipTo: selectedLocation.address?.formatted?.join('\n') ?? null });
  }, [selectedLocation]);

  const vendorCustomerQuery = useCustomerQuery({ fetch, id: createPurchaseOrder.vendorCustomerId });
  const vendorCustomer = vendorCustomerQuery.data;

  // Default "Ship From" to vendor's default address
  useEffect(() => {
    if (!vendorCustomer) return;
    if (createPurchaseOrder.shipFrom) return;
    dispatch.setPartial({ shipFrom: vendorCustomer.defaultAddress?.formatted?.join('\n') ?? null });
  }, [vendorCustomer]);

  return (
    <Screen title={createPurchaseOrder.name ?? 'New purchase order'} isLoading={purchaseOrderMutation.isLoading}>
      <ScrollView>
        <Stack direction={'vertical'} paddingVertical={'Small'}>
          <ResponsiveGrid columns={4} grow>
            {createPurchaseOrder.name && (
              <TextField label={'Purchase Order ID'} disabled value={createPurchaseOrder.name} />
            )}
            <TextField
              label={'Vendor'}
              onFocus={vendorSelectorWarningDialog.show}
              value={createPurchaseOrder.vendorName ?? (vendorCustomerQuery.isLoading ? 'Loading...' : '')}
              disabled={vendorSelectorWarningDialog.isVisible || vendorCustomerQuery.isLoading}
            />

            <TextField
              label={'Location'}
              onFocus={locationSelectorPopup.navigate}
              value={selectedLocation?.name ?? ''}
            />
            <TextField
              label={'Status'}
              onFocus={statusSelectorPopup.navigate}
              value={titleCase(createPurchaseOrder.status)}
            />
          </ResponsiveGrid>
        </Stack>

        <ResponsiveGrid columns={3}>
          <ResponsiveGrid columns={1}>
            <TextArea
              label={'Ship From'}
              value={createPurchaseOrder.shipFrom ?? ''}
              onChange={(shipFrom: string) => dispatch.setPartial({ shipFrom: shipFrom || null })}
            />
            {!!vendorCustomer?.defaultAddress?.formatted &&
              createPurchaseOrder.shipFrom !== vendorCustomer.defaultAddress.formatted.join('\n') && (
                <Button
                  title={'Use Vendor Address'}
                  onPress={() => {
                    if (!vendorCustomer.defaultAddress) return;
                    dispatch.setPartial({ shipFrom: vendorCustomer.defaultAddress.formatted.join('\n') });
                  }}
                />
              )}
          </ResponsiveGrid>
          <ResponsiveGrid columns={1}>
            <TextArea
              label={'Ship To'}
              value={createPurchaseOrder.shipTo ?? ''}
              onChange={(shipTo: string) => dispatch.setPartial({ shipTo: shipTo || null })}
            />
            {!!selectedLocation?.address?.formatted &&
              createPurchaseOrder.shipTo !== selectedLocation.address.formatted.join('\n') && (
                <Button
                  title={'Use Location Address'}
                  onPress={() => dispatch.setPartial({ shipTo: selectedLocation.address.formatted.join('\n') })}
                />
              )}
          </ResponsiveGrid>

          <TextArea
            label={'Note'}
            value={createPurchaseOrder.note}
            onChange={(note: string) => dispatch.setPartial({ note: note || null })}
          />
        </ResponsiveGrid>

        <Stack direction={'vertical'} paddingVertical={'Small'}>
          <ResponsiveGrid columns={3}>
            <TextArea
              label={'Assigned Employees'}
              value={createPurchaseOrder.employeeAssignments.map(({ employeeName }) => employeeName).join(', ')}
              onFocus={() => employeeSelectorPopup.navigate(createPurchaseOrder.employeeAssignments)}
            />

            {Object.entries(createPurchaseOrder.customFields).map(([key, value], i) => (
              <TextField
                key={i}
                label={key}
                value={value}
                onChange={(value: string) =>
                  dispatch.setPartial({ customFields: { ...createPurchaseOrder.customFields, [key]: value } })
                }
              />
            ))}

            <Button
              title={'Manage Fields'}
              type={'plain'}
              onPress={() => customFieldConfigPopup.navigate(createPurchaseOrder)}
            />
          </ResponsiveGrid>
        </Stack>

        <Stack direction={'vertical'} paddingVertical={'Small'} flex={1}>
          <ResponsiveGrid columns={2}>
            <ResponsiveGrid columns={1}>
              <Button title={'Add Product'} type={'primary'} onPress={selectVendorBeforeAddingProductsDialog.show} />
              <ControlledSearchBar placeholder={'Search products'} onTextChange={setQuery} onSearch={() => {}} />
              <List data={productRows} isLoadingMore={false} onEndReached={() => {}} imageDisplayStrategy={'always'} />
              {productRows.length === 0 ? (
                <Stack direction="horizontal" alignment="center" paddingVertical={'Large'}>
                  <Text variant="body" color="TextSubdued">
                    No products added to purchase order
                  </Text>
                </Stack>
              ) : null}
            </ResponsiveGrid>

            <ResponsiveGrid columns={1}>
              <ResponsiveGrid columns={2}>
                <Text>some more fields</Text>
              </ResponsiveGrid>

              <Button
                title={!!createPurchaseOrder.name ? 'Update purchase order' : 'Create purchase order'}
                type={'primary'}
                onPress={() => purchaseOrderMutation.mutate(createPurchaseOrder)}
              />
            </ResponsiveGrid>
          </ResponsiveGrid>
        </Stack>
      </ScrollView>
    </Screen>
  );
}

function useProductRows(
  { products }: Pick<CreatePurchaseOrder, 'products' | 'locationId'>,
  query: string,
  openConfig: PopupNavigateFn<'ProductConfig'>,
) {
  query = query.trim();

  const productVariantIds = unique(products.map(product => product.productVariantId));

  const fetch = useAuthenticatedFetch();
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const getDisplayName = (product: Product) => {
    const variant = productVariantQueries[product.productVariantId]?.data ?? null;
    return getProductVariantName(variant) ?? 'Unknown Product';
  };

  const queryFilter = (product: Product) => {
    const displayName = getDisplayName(product);
    const variant = productVariantQueries[product.productVariantId]?.data ?? null;
    return !query || displayName.toLowerCase().includes(query.toLowerCase()) || !!variant?.sku?.includes(query);
  };

  return products.filter(queryFilter).map<ListRow>((product, i) => {
    const variant = productVariantQueries[product.productVariantId]?.data ?? null;

    const displayName = getDisplayName(product);
    const imageUrl = variant?.image?.url ?? variant?.product?.featuredImage?.url;

    return {
      id: String(i),
      onPress: () => openConfig(product),
      leftSide: {
        label: displayName,
        image: {
          source: imageUrl,
          badge: product.quantity,
        },
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}

const useVendorChangeWarningDialog = (
  createPurchaseOrder: Pick<CreatePurchaseOrder, 'vendorCustomerId' | 'products'>,
  openVendorPopup: PopupNavigateFn<'VendorSelector'>,
) => {
  const dialog = useDialog();

  const showDialog = createPurchaseOrder.vendorCustomerId !== null && createPurchaseOrder.products.length > 0;

  return {
    ...dialog,
    show: () => {
      dialog.show({
        showDialog,
        onAction: openVendorPopup,
        props: {
          title: 'Vendor Already Set',
          type: 'alert',
          content: 'Are you certain you want to change the vendor? This will clear the products.',
          actionText: 'Change Vendor',
          showSecondaryAction: true,
          secondaryActionText: 'Cancel',
        },
      });
    },
  };
};

const useSelectVendorBeforeAddingProductsDialog = (
  createPurchaseOrder: Pick<CreatePurchaseOrder, 'vendorCustomerId' | 'vendorName' | 'locationId' | 'locationName'>,
  openVendorPopup: PopupNavigateFn<'VendorSelector'>,
  openProductSelectorPopup: PopupNavigateFn<'ProductSelector'>,
) => {
  const dialog = useDialog();

  const showDialog = createPurchaseOrder.vendorCustomerId === null;

  const onAction = () => {
    if (showDialog) {
      openVendorPopup();
    } else {
      openProductSelectorPopup(createPurchaseOrder);
    }
  };

  return {
    ...dialog,
    show: () => {
      dialog.show({
        showDialog,
        onAction,
        props: {
          title: 'Select Vendor',
          type: 'default',
          content: 'You must select a vendor before adding products to the purchase order.',
          actionText: 'Select Vendor',
          showSecondaryAction: true,
          secondaryActionText: 'Cancel',
        },
      });
    },
  };
};
