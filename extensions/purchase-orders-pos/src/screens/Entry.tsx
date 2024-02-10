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
import { useState } from 'react';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useDialog } from '@work-orders/common-pos/providers/DialogProvider.js';

export function Entry() {
  const [query, setQuery] = useState('');

  const { Screen, usePopup } = useScreen('Entry', () => {
    setQuery('');
  });
  const fetch = useAuthenticatedFetch();

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const [createPurchaseOrder, dispatch] = useCreatePurchaseOrderReducer();

  const statusSelectorPopup = usePopup('StatusSelector', status => dispatch.setPartial({ status }));
  const productSelectorPopup = usePopup('ProductSelector', products => dispatch.addProducts({ products }));
  const productConfigPopup = usePopup('ProductConfig', product => dispatch.updateProduct({ product }));
  const locationSelectorPopup = usePopup('LocationSelector', location =>
    dispatch.setPartial({ locationId: location?.id ?? null }),
  );
  const vendorSelectorPopup = usePopup('VendorSelector', vendor =>
    dispatch.setPartial({ vendorCustomerId: vendor.customerId, products: [] }),
  );

  const vendorSelectorWarningDialog = useVendorChangeWarningDialog(createPurchaseOrder, vendorSelectorPopup.navigate);

  const productRows = useProductRows(createPurchaseOrder, query, productConfigPopup.navigate);

  const selectedLocationQuery = useLocationQuery({ fetch, id: createPurchaseOrder.locationId });
  const selectedLocation = selectedLocationQuery.data;

  const vendorCustomerQuery = useCustomerQuery({ fetch, id: createPurchaseOrder.vendorCustomerId });
  const vendorCustomer = vendorCustomerQuery.data;

  return (
    <Screen title={'Purchase Orders'}>
      <ScrollView>
        <ResponsiveGrid columns={2}>
          <ResponsiveGrid columns={2}>
            <TextField
              label={'Vendor'}
              onFocus={vendorSelectorWarningDialog.show}
              value={vendorCustomer?.displayName ?? ''}
              disabled={vendorSelectorWarningDialog.isVisible}
            />
            <TextField label={'PO #'} />
          </ResponsiveGrid>
          <ResponsiveGrid columns={2}>
            <TextField
              label={'Status'}
              onFocus={statusSelectorPopup.navigate}
              value={titleCase(createPurchaseOrder.status)}
            />
            <TextField label={'Date'} />
          </ResponsiveGrid>

          <TextArea label={'Ship From'} rows={3} value={vendorCustomer?.defaultAddress?.formatted?.join('\n') ?? ''} />
          <TextArea label={'Ship To'} rows={3} value={selectedLocation?.address?.formatted?.join('\n') ?? ''} />

          <ResponsiveGrid columns={2}>
            <TextField
              label={'Sales Order #'}
              onChange={(salesOrderId: string) => dispatch.setPartial({ salesOrderId: salesOrderId || null })}
            />
            <TextField label={'Vendor Ref #'} />
          </ResponsiveGrid>
          <ResponsiveGrid columns={2}>
            <TextField label={'Expected'} />
            <TextField label={'Terms'} />
          </ResponsiveGrid>

          <ResponsiveGrid columns={2}>
            <TextField label={'Ship via'} />
            <TextField label={'Charge via'} />
          </ResponsiveGrid>
          <TextField label={'Assign Employees'} />

          <TextField
            label={'Location'}
            onFocus={locationSelectorPopup.navigate}
            value={selectedLocation?.name ?? ''}
            action={{
              label: 'Clear',
              onPress: () => dispatch.setPartial({ locationId: null }),
              disabled: !selectedLocation,
            }}
          />
          <TextField label={'Comments'} />
        </ResponsiveGrid>

        <ResponsiveGrid columns={2}>
          <ResponsiveGrid columns={1}>
            <Button title={'Add Product'} type={'primary'} onPress={productSelectorPopup.navigate} />
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
              <TextField label={'Subtotal'} />
              <TextField label={'Discount'} />
              <TextField label={'Tax'} />
              <TextField label={'Shipping'} />
            </ResponsiveGrid>
            <TextField label={'Total'} />
            <ResponsiveGrid columns={2}>
              <TextField label={'Deposited'} />
              <TextField label={'Paid'} />
            </ResponsiveGrid>
            <TextField label={'Balance Due'} />
            <Button title={'Create Order'} type={'primary'} onPress={() => toast.show('Save')} />
          </ResponsiveGrid>
        </ResponsiveGrid>
        <Text>{JSON.stringify(createPurchaseOrder, null, 2)}</Text>
        <Text>{JSON.stringify(selectedLocationQuery.data, null, 2)}</Text>
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
          source: imageUrl ?? 'not found',
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
