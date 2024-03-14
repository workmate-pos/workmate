import {
  Banner,
  List,
  ListRow,
  ScrollView,
  Stack,
  Text,
  TextArea,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { CreatePurchaseOrderDispatchProxy, useCreatePurchaseOrderReducer } from '../create-purchase-order/reducer.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { CreatePurchaseOrder, Product } from '@web/schemas/generated/create-purchase-order.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useEffect, useState } from 'react';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { usePurchaseOrderMutation } from '@work-orders/common/queries/use-purchase-order-mutation.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useRouter } from '../routes.js';
import { useForm } from '@teifi-digital/pos-tools/form';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { useDialog } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { FormMoneyField } from '@teifi-digital/pos-tools/form/components/FormMoneyField.js';
import { createPurchaseOrderFromPurchaseOrder } from '../create-purchase-order/from-purchase-order.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';

// TODO: A new screen to view linked orders/workorders
// TODO: A way to link purchase order line items to SO line items
export function PurchaseOrder({ initialCreatePurchaseOrder }: { initialCreatePurchaseOrder: CreatePurchaseOrder }) {
  const [query, setQuery] = useState('');
  const { Form } = useForm();

  const [createPurchaseOrder, dispatch, hasUnsavedChanges, setHasUnsavedChanges] =
    useCreatePurchaseOrderReducer(initialCreatePurchaseOrder);

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const router = useRouter();

  const screen = useScreen();
  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  const vendorSelectorWarningDialog = useVendorChangeWarningDialog(createPurchaseOrder, dispatch);
  const addProductPrerequisitesDialog = useAddProductPrerequisitesDialog(createPurchaseOrder, dispatch);

  const fetch = useAuthenticatedFetch();
  const purchaseOrderMutation = usePurchaseOrderMutation(
    { fetch },
    {
      onSuccess: ({ purchaseOrder }) => {
        const message = !!createPurchaseOrder.name ? 'Purchase order updated' : 'Purchase order created';
        toast.show(message);
        dispatch.set(createPurchaseOrderFromPurchaseOrder(purchaseOrder));
        setHasUnsavedChanges(false);
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

  const vendorsQuery = useVendorsQuery({ fetch });
  const vendorCustomer = vendorsQuery?.data?.find(vendor => vendor.name === createPurchaseOrder.vendorName)?.customer;

  // Default "Ship From" to vendor's default address
  useEffect(() => {
    if (!vendorCustomer) return;
    if (createPurchaseOrder.shipFrom) return;
    dispatch.setPartial({ shipFrom: vendorCustomer.defaultAddress?.formatted?.join('\n') });
  }, [vendorCustomer]);

  const assignedEmployeeIds = createPurchaseOrder.employeeAssignments.map(({ employeeId }) => employeeId);
  const employeeQueries = useEmployeeQueries({ fetch, ids: assignedEmployeeIds });

  const productRows = useProductRows(createPurchaseOrder, dispatch, query, purchaseOrderMutation.isLoading);

  const subtotal = BigDecimal.sum(
    ...createPurchaseOrder.lineItems.map(product =>
      BigDecimal.fromMoney(product.unitCost).multiply(BigDecimal.fromString(product.quantity.toFixed(0))),
    ),
  );

  const total = BigDecimal.sum(
    subtotal,
    createPurchaseOrder.tax ? BigDecimal.fromMoney(createPurchaseOrder.tax) : BigDecimal.ZERO,
    createPurchaseOrder.shipping ? BigDecimal.fromMoney(createPurchaseOrder.shipping) : BigDecimal.ZERO,
  ).subtract(createPurchaseOrder.discount ? BigDecimal.fromMoney(createPurchaseOrder.discount) : BigDecimal.ZERO);

  const balanceDue = total.subtract(
    BigDecimal.sum(
      createPurchaseOrder.deposited ? BigDecimal.fromMoney(createPurchaseOrder.deposited) : BigDecimal.ZERO,
      createPurchaseOrder.paid ? BigDecimal.fromMoney(createPurchaseOrder.paid) : BigDecimal.ZERO,
    ),
  );

  const hasProductQuantity = createPurchaseOrder.lineItems.some(product => product.quantity > 0);

  // whether there is some product.availableQuantity > 0. used to determine whether we should show "Mark as received" or "Mark as not received" button
  const productHasAvailableQuantity = createPurchaseOrder.lineItems.some(product => product.availableQuantity > 0);

  useEffect(() => {
    screen.setTitle(createPurchaseOrder.name ?? 'New purchase order');
  }, [createPurchaseOrder]);

  return (
    <ScrollView>
      <Form disabled={purchaseOrderMutation.isLoading}>
        {purchaseOrderMutation.error && (
          <Banner
            title={`Error saving purchase order: ${extractErrorMessage(purchaseOrderMutation.error)}`}
            variant={'error'}
            visible
          />
        )}

        <Stack direction={'vertical'} paddingVertical={'Small'}>
          <ResponsiveGrid columns={4} grow>
            {createPurchaseOrder.name && (
              <FormStringField label={'Purchase Order ID'} disabled value={createPurchaseOrder.name} />
            )}
            <FormStringField
              label={'Vendor'}
              onFocus={vendorSelectorWarningDialog.show}
              value={createPurchaseOrder.vendorName ?? ''}
              disabled={vendorSelectorWarningDialog.isVisible}
            />

            <FormStringField
              label={'Location'}
              onFocus={() => {
                router.push('LocationSelector', {
                  onSelect: location => dispatch.setLocation({ locationId: location?.id ?? null }),
                });
              }}
              value={selectedLocation?.name ?? ''}
            />
            <FormStringField
              label={'Status'}
              onFocus={() => {
                router.push('StatusSelector', {
                  onSelect: status => dispatch.setPartial({ status }),
                });
              }}
              value={titleCase(createPurchaseOrder.status)}
            />
          </ResponsiveGrid>
        </Stack>

        <ResponsiveGrid columns={3}>
          <ResponsiveGrid columns={1}>
            <FormStringField
              label={'Ship From'}
              value={createPurchaseOrder.shipFrom ?? ''}
              onChange={(shipFrom: string) => dispatch.setPartial({ shipFrom })}
            />
            {!!vendorCustomer?.defaultAddress?.formatted &&
              createPurchaseOrder.shipFrom !== vendorCustomer.defaultAddress.formatted.join('\n') && (
                <FormButton
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
              onChange={(shipTo: string) => dispatch.setPartial({ shipTo })}
              disabled={purchaseOrderMutation.isLoading}
            />
            {!!selectedLocation?.address?.formatted &&
              createPurchaseOrder.shipTo !== selectedLocation.address.formatted.join('\n') && (
                <FormButton
                  title={'Use Location Address'}
                  onPress={() => dispatch.setPartial({ shipTo: selectedLocation.address.formatted.join('\n') })}
                />
              )}
          </ResponsiveGrid>

          <ResponsiveGrid columns={1}>
            <TextArea
              label={'Note'}
              value={createPurchaseOrder.note}
              onChange={(note: string) => dispatch.setPartial({ note })}
              disabled={purchaseOrderMutation.isLoading}
            />
          </ResponsiveGrid>
        </ResponsiveGrid>

        <Stack direction={'vertical'} paddingVertical={'Small'}>
          <ResponsiveGrid columns={3}>
            <FormStringField
              label={'Assigned Employees'}
              value={
                Object.values(employeeQueries).some(query => query.isLoading)
                  ? 'Loading...'
                  : createPurchaseOrder.employeeAssignments
                      .map(({ employeeId }) => employeeQueries[employeeId]?.data?.name ?? 'Unknown Employee')
                      .join(', ')
              }
              onFocus={() => {
                router.push('EmployeeSelector', {
                  initialEmployeeAssignments: createPurchaseOrder.employeeAssignments,
                  onSave: employeeAssignments => dispatch.setPartial({ employeeAssignments }),
                });
              }}
              action={{
                label: '×',
                disabled: createPurchaseOrder.employeeAssignments.length === 0,
                onPress: () => dispatch.setPartial({ employeeAssignments: [] }),
              }}
            />

            {Object.entries(createPurchaseOrder.customFields).map(([key, value], i) => (
              <FormStringField
                key={i}
                label={key}
                value={value}
                onChange={(value: string) =>
                  dispatch.setPartial({ customFields: { ...createPurchaseOrder.customFields, [key]: value } })
                }
              />
            ))}

            <FormButton
              title={'Custom Fields'}
              onPress={() => {
                router.push('CustomFieldConfig', {
                  initialCustomFields: createPurchaseOrder.customFields,
                  onSave: customFields => dispatch.setPartial({ customFields }),
                });
              }}
            />
          </ResponsiveGrid>
        </Stack>

        <Stack direction={'vertical'} paddingVertical={'Small'}>
          <ResponsiveGrid columns={2}>
            <ResponsiveGrid columns={1}>
              <FormButton title={'Add Product'} type={'primary'} onPress={addProductPrerequisitesDialog.show} />

              {createPurchaseOrder.name && hasProductQuantity && productHasAvailableQuantity && (
                <FormButton
                  title={'Mark all as not received'}
                  type={'destructive'}
                  onPress={() => dispatch.setInventoryState({ inventoryState: 'unavailable' })}
                />
              )}
              {createPurchaseOrder.name && hasProductQuantity && !productHasAvailableQuantity && (
                <FormButton
                  title={'Mark all as received'}
                  onPress={() => dispatch.setInventoryState({ inventoryState: 'available' })}
                />
              )}

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
                <FormMoneyField label={'Subtotal'} value={subtotal.toMoney()} disabled />
                <CreatePurchaseOrderMoneyField
                  createPurchaseOrder={createPurchaseOrder}
                  dispatch={dispatch}
                  field={'discount'}
                />
                <CreatePurchaseOrderMoneyField
                  createPurchaseOrder={createPurchaseOrder}
                  dispatch={dispatch}
                  field={'tax'}
                />
                <CreatePurchaseOrderMoneyField
                  createPurchaseOrder={createPurchaseOrder}
                  dispatch={dispatch}
                  field={'shipping'}
                />
              </ResponsiveGrid>
              <FormMoneyField label={'Total'} value={total.toMoney()} disabled />

              <ResponsiveGrid columns={2}>
                <CreatePurchaseOrderMoneyField
                  createPurchaseOrder={createPurchaseOrder}
                  dispatch={dispatch}
                  field={'deposited'}
                />
                <CreatePurchaseOrderMoneyField
                  createPurchaseOrder={createPurchaseOrder}
                  dispatch={dispatch}
                  field={'paid'}
                />
              </ResponsiveGrid>
              <FormMoneyField label={'Balance Due'} value={balanceDue.toMoney()} disabled />
            </ResponsiveGrid>
          </ResponsiveGrid>
        </Stack>

        <Stack direction={'vertical'} paddingVertical={'Small'}>
          <ResponsiveGrid columns={1}>
            <FormButton
              title={'Print'}
              type={'basic'}
              action={'button'}
              disabled={!createPurchaseOrder.name || hasUnsavedChanges}
              onPress={() => {
                if (createPurchaseOrder.name) {
                  router.push('PrintOverview', {
                    name: createPurchaseOrder.name,
                  });
                }
              }}
            />
            {!createPurchaseOrder.name ||
              (hasUnsavedChanges && (
                <Text color="TextSubdued" variant="body">
                  You must save your purchase order before you can print
                </Text>
              ))}
          </ResponsiveGrid>

          <FormButton
            title={!!createPurchaseOrder.name ? 'Update purchase order' : 'Create purchase order'}
            type={'primary'}
            onPress={() => purchaseOrderMutation.mutate(createPurchaseOrder)}
            loading={purchaseOrderMutation.isLoading}
            action={'submit'}
          />
        </Stack>
      </Form>
    </ScrollView>
  );
}

function useProductRows(
  { lineItems, locationId }: Pick<CreatePurchaseOrder, 'lineItems' | 'locationId'>,
  dispatch: CreatePurchaseOrderDispatchProxy,
  query: string,
  disabled: boolean,
) {
  query = query.trim();

  const { toast } = useExtensionApi<'pos.home.modal.render'>();
  const fetch = useAuthenticatedFetch();
  const router = useRouter();

  const productVariantIds = unique(lineItems.map(product => product.productVariantId));
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

  return lineItems.filter(queryFilter).map<ListRow>((product, i) => {
    const variant = productVariantQueries[product.productVariantId]?.data ?? null;

    const displayName = getDisplayName(product);
    const imageUrl = variant?.image?.url ?? variant?.product?.featuredImage?.url;

    return {
      id: String(i),
      onPress: () => {
        if (disabled) return;

        if (!locationId) {
          toast.show('Location id not set');
          return;
        }

        router.push('ProductConfig', {
          product,
          locationId,
          onSave: product => dispatch.updateProduct({ product }),
        });
      },
      leftSide: {
        label: displayName,
        image: {
          source: imageUrl,
          badge: product.quantity,
        },
      },
      rightSide: {
        showChevron: !disabled,
      },
    };
  });
}

const useVendorChangeWarningDialog = (
  createPurchaseOrder: Pick<CreatePurchaseOrder, 'vendorName' | 'lineItems'>,
  dispatch: CreatePurchaseOrderDispatchProxy,
) => {
  const dialog = useDialog();
  const router = useRouter();

  const showDialog = createPurchaseOrder.vendorName !== null && createPurchaseOrder.lineItems.length > 0;

  return {
    ...dialog,
    show: () => {
      dialog.show({
        showDialog,
        onAction: () => {
          router.push('VendorSelector', {
            onSelect: vendorDetails => dispatch.setVendor(vendorDetails),
          });
        },
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

const useAddProductPrerequisitesDialog = (
  createPurchaseOrder: Pick<CreatePurchaseOrder, 'locationId' | 'vendorName'>,
  dispatch: CreatePurchaseOrderDispatchProxy,
) => {
  const dialog = useDialog();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();
  const router = useRouter();

  const hasVendor = createPurchaseOrder.vendorName !== null;
  const hasLocation = createPurchaseOrder.locationId !== null;

  const showDialog = !hasVendor || !hasLocation;
  const onAction = () => {
    if (!hasVendor) {
      router.push('VendorSelector', {
        onSelect: vendorDetails => dispatch.setVendor(vendorDetails),
      });
    } else if (!hasLocation) {
      router.push('LocationSelector', {
        onSelect: location => dispatch.setLocation({ locationId: location?.id ?? null }),
      });
    } else {
      if (!createPurchaseOrder.locationId) {
        toast.show('Location id not set');
        return;
      }

      if (!createPurchaseOrder.vendorName) {
        toast.show('Vendor name not set');
        return;
      }

      router.push('ProductSelector', {
        filters: {
          vendorName: createPurchaseOrder.vendorName,
          locationId: createPurchaseOrder.locationId,
        },
        onSelect: product => dispatch.addProducts({ products: [product] }),
      });
    }
  };

  const subject = !hasVendor ? 'vendor' : 'location';
  const title = titleCase(`Select ${subject}`);
  const content = `You must select a ${subject} before adding products to the purchase order.`;

  return {
    ...dialog,
    show: () => {
      dialog.show({
        showDialog,
        onAction,
        props: {
          type: 'default',
          title,
          content,
          actionText: title,
          showSecondaryAction: true,
          secondaryActionText: 'Cancel',
        },
      });
    },
  };
};

type CreatePurchaseOrderMoneyField = 'discount' | 'tax' | 'shipping' | 'deposited' | 'paid';

function CreatePurchaseOrderMoneyField<const Field extends CreatePurchaseOrderMoneyField>({
  createPurchaseOrder,
  dispatch,
  field,
}: {
  createPurchaseOrder: Pick<CreatePurchaseOrder, Field>;
  dispatch: CreatePurchaseOrderDispatchProxy;
  field: Field;
}) {
  return (
    <FormMoneyField
      key={field}
      label={titleCase(field)}
      value={createPurchaseOrder[field]}
      onChange={value => dispatch.setPartial({ [field]: value })}
    />
  );
}
