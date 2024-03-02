import { List, ListRow, ScrollView, Stack, Text, TextArea, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { CreatePurchaseOrderDispatchProxy, useCreatePurchaseOrderReducer } from '../create-purchase-order/reducer.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { CreatePurchaseOrder, Product } from '@web/schemas/generated/create-purchase-order.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useEffect, useState } from 'react';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { usePurchaseOrderMutation } from '@work-orders/common/queries/use-purchase-order-mutation.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useRouter } from '../routes.js';
import { useForm } from '@teifi-digital/pos-tools/form';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ResponsiveGrid, ResponsiveGridProps } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { useDialog } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { FormMoneyField } from '@teifi-digital/pos-tools/form/components/FormMoneyField.js';

// TODO: TextArea in pos-tools
export function PurchaseOrder({
  initialCreatePurchaseOrder,
}: {
  initialCreatePurchaseOrder: CreatePurchaseOrder | null;
}) {
  const [query, setQuery] = useState('');
  const { Form, isValid } = useForm();

  const [createPurchaseOrder, dispatch, hasUnsavedChanges, setHasUnsavedChanges] = useCreatePurchaseOrderReducer(
    initialCreatePurchaseOrder ?? undefined,
  );

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
        dispatch.set(purchaseOrder);
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

  const vendorCustomerQuery = useCustomerQuery({ fetch, id: createPurchaseOrder.vendorCustomerId });
  const vendorCustomer = vendorCustomerQuery.data;

  // Default "Ship From" to vendor's default address
  useEffect(() => {
    if (!vendorCustomer) return;
    if (createPurchaseOrder.shipFrom) return;
    dispatch.setPartial({ shipFrom: vendorCustomer.defaultAddress?.formatted?.join('\n') ?? null });
  }, [vendorCustomer]);

  const productRows = useProductRows(createPurchaseOrder, dispatch, query, purchaseOrderMutation.isLoading);

  const total = BigDecimal.sum(
    createPurchaseOrder.subtotal ? BigDecimal.fromMoney(createPurchaseOrder.subtotal) : BigDecimal.ZERO,
    createPurchaseOrder.tax ? BigDecimal.fromMoney(createPurchaseOrder.tax) : BigDecimal.ZERO,
    createPurchaseOrder.shipping ? BigDecimal.fromMoney(createPurchaseOrder.shipping) : BigDecimal.ZERO,
  ).subtract(createPurchaseOrder.discount ? BigDecimal.fromMoney(createPurchaseOrder.discount) : BigDecimal.ZERO);

  const balanceDue = total.subtract(
    BigDecimal.sum(
      createPurchaseOrder.deposited ? BigDecimal.fromMoney(createPurchaseOrder.deposited) : BigDecimal.ZERO,
      createPurchaseOrder.paid ? BigDecimal.fromMoney(createPurchaseOrder.paid) : BigDecimal.ZERO,
    ),
  );

  const hasProductQuantity = createPurchaseOrder.products.some(product => product.quantity > 0);

  // whether there is some product.availableQuantity > 0. used to determine whether we should show "Mark as received" or "Mark as not received" button
  const productHasAvailableQuantity = createPurchaseOrder.products.some(product => product.availableQuantity > 0);

  useEffect(() => {
    screen.setTitle(createPurchaseOrder.name ?? 'New purchase order');
  }, [createPurchaseOrder]);

  return (
    <ScrollView>
      <Form disabled={purchaseOrderMutation.isLoading}>
        <Stack direction={'vertical'} paddingVertical={'Small'}>
          <ResponsiveGrid columns={4} grow>
            {createPurchaseOrder.name && (
              <FormStringField label={'Purchase Order ID'} disabled value={createPurchaseOrder.name} />
            )}
            <FormStringField
              label={'Vendor'}
              onFocus={vendorSelectorWarningDialog.show}
              value={createPurchaseOrder.vendorName ?? (vendorCustomerQuery.isLoading ? 'Loading...' : '')}
              disabled={vendorSelectorWarningDialog.isVisible || vendorCustomerQuery.isLoading}
            />

            <FormStringField
              label={'Location'}
              onFocus={() => {
                router.push('LocationSelector', {
                  onSelect: location => {
                    dispatch.setLocation({ locationId: location?.id ?? null, locationName: location?.name ?? null });
                    router.pop();
                  },
                });
              }}
              value={selectedLocation?.name ?? ''}
            />
            <FormStringField
              label={'Status'}
              onFocus={() => {
                router.push('StatusSelector', {
                  onSelect: status => {
                    dispatch.setPartial({ status });
                    router.pop();
                  },
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
              onChange={(shipFrom: string) => dispatch.setPartial({ shipFrom: shipFrom || null })}
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
              onChange={(shipTo: string) => dispatch.setPartial({ shipTo: shipTo || null })}
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
              onChange={(note: string) => dispatch.setPartial({ note: note || null })}
              disabled={purchaseOrderMutation.isLoading}
            />
          </ResponsiveGrid>
        </ResponsiveGrid>

        <Stack direction={'vertical'} paddingVertical={'Small'}>
          <ResponsiveGrid columns={3}>
            <FormStringField
              label={'Assigned Employees'}
              value={createPurchaseOrder.employeeAssignments.map(({ employeeName }) => employeeName).join(', ')}
              onFocus={() => {
                router.push('EmployeeSelector', {
                  initialEmployeeAssignments: createPurchaseOrder.employeeAssignments,
                  onSave: employeeAssignments => {
                    dispatch.setPartial({ employeeAssignments });
                    router.pop();
                  },
                });
              }}
              action={{
                label: '×',
                disabled: createPurchaseOrder.employeeAssignments.length === 0,
                onPress: () => dispatch.setPartial({ employeeAssignments: [] }),
              }}
            />

            <FormStringField
              label={'Linked Work Order ID'}
              value={createPurchaseOrder.workOrderName ?? ''}
              onFocus={() => {
                router.push('WorkOrderSelector', {
                  onSelect: workOrderDetails => {
                    dispatch.setWorkOrder(workOrderDetails);
                    router.pop();
                  },
                });
              }}
              action={{
                label: '×',
                disabled: createPurchaseOrder.workOrderName === null,
                onPress: () =>
                  dispatch.setWorkOrder({
                    workOrderName: null,
                    customerName: null,
                    customerId: null,
                    orderId: null,
                    orderName: null,
                  }),
              }}
            />

            <FormStringField
              label={'Linked Order ID'}
              value={!!createPurchaseOrder.orderId ? createPurchaseOrder.orderName ?? 'Unknown' : ''}
              onFocus={() => {
                router.push('OrderSelector', {
                  onSelect: orderDetails => {
                    dispatch.setOrder(orderDetails);
                    router.pop();
                  },
                });
              }}
              action={{
                label: '×',
                disabled: createPurchaseOrder.orderId === null,
                onPress: () =>
                  dispatch.setOrder({ orderName: null, orderId: null, customerName: null, customerId: null }),
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
                  onSave: customFields => {
                    dispatch.setPartial({ customFields });
                    router.pop();
                  },
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
              <MoneyInputGroup
                grid={{ columns: 2 }}
                fields={['subtotal', 'discount', 'tax', 'shipping']}
                createPurchaseOrder={createPurchaseOrder}
                dispatch={dispatch}
              />
              <FormMoneyField label={'Total'} value={total.toMoney()} disabled />

              <MoneyInputGroup
                grid={{ columns: 2 }}
                fields={['deposited', 'paid']}
                createPurchaseOrder={createPurchaseOrder}
                dispatch={dispatch}
              />
              <FormMoneyField label={'Balance Due'} value={balanceDue.toMoney()} disabled />
            </ResponsiveGrid>
          </ResponsiveGrid>
        </Stack>

        <Stack direction={'vertical'} paddingVertical={'Small'}>
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
  { products, locationName, locationId }: Pick<CreatePurchaseOrder, 'products' | 'locationName' | 'locationId'>,
  dispatch: CreatePurchaseOrderDispatchProxy,
  query: string,
  disabled: boolean,
) {
  query = query.trim();

  const { toast } = useExtensionApi<'pos.home.modal.render'>();
  const fetch = useAuthenticatedFetch();
  const router = useRouter();

  const productVariantIds = unique(products.map(product => product.productVariantId));
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
      onPress: () => {
        if (disabled) return;

        if (!locationName) {
          toast.show('Location name not set');
          return;
        }

        if (!locationId) {
          toast.show('Location id not set');
          return;
        }

        router.push('ProductConfig', {
          product,
          locationName,
          locationId,
          onSave: product => {
            dispatch.updateProduct({ product });
            router.pop();
          },
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
  createPurchaseOrder: Pick<CreatePurchaseOrder, 'vendorCustomerId' | 'products'>,
  dispatch: CreatePurchaseOrderDispatchProxy,
) => {
  const dialog = useDialog();
  const router = useRouter();

  const showDialog = createPurchaseOrder.vendorCustomerId !== null && createPurchaseOrder.products.length > 0;

  return {
    ...dialog,
    show: () => {
      dialog.show({
        showDialog,
        onAction: () => {
          router.push('VendorSelector', {
            onSelect: vendorDetails => {
              dispatch.setVendor(vendorDetails);
              router.pop();
            },
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
  createPurchaseOrder: Pick<CreatePurchaseOrder, 'locationId' | 'vendorName' | 'locationName'>,
  dispatch: CreatePurchaseOrderDispatchProxy,
) => {
  const dialog = useDialog();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();
  const router = useRouter();

  const hasVendor = createPurchaseOrder.vendorName !== null;
  const hasLocation = createPurchaseOrder.locationId !== null && createPurchaseOrder.locationName !== null;

  const showDialog = !hasVendor || !hasLocation;
  const onAction = () => {
    if (!hasVendor) {
      router.push('VendorSelector', {
        onSelect: vendorDetails => {
          dispatch.setVendor(vendorDetails);
          router.pop();
        },
      });
    } else if (!hasLocation) {
      router.push('LocationSelector', {
        onSelect: location => {
          dispatch.setLocation({ locationId: location?.id ?? null, locationName: location?.name ?? null });
          router.pop();
        },
      });
    } else {
      if (!createPurchaseOrder.locationName) {
        toast.show('Location name not set');
        return;
      }

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
          locationName: createPurchaseOrder.locationName,
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

type CreatePurchaseOrderMoneyField = 'subtotal' | 'discount' | 'tax' | 'shipping' | 'deposited' | 'paid';

function MoneyInputGroup<const F extends CreatePurchaseOrderMoneyField>({
  createPurchaseOrder,
  dispatch,
  fields,
  grid,
}: {
  fields: readonly F[];
  createPurchaseOrder: Pick<CreatePurchaseOrder, F>;
  dispatch: CreatePurchaseOrderDispatchProxy;
  grid: ResponsiveGridProps;
}) {
  return (
    <ResponsiveGrid {...grid}>
      {fields.map(field => (
        <FormMoneyField
          key={field}
          label={titleCase(field)}
          value={createPurchaseOrder[field]}
          onChange={value => dispatch.setPartial({ [field]: value })}
        />
      ))}
    </ResponsiveGrid>
  );
}
