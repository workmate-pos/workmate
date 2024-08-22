import {
  Banner,
  DateField,
  List,
  ListRow,
  ScrollView,
  Stack,
  Text,
  TextArea,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { CreatePurchaseOrder, DateTime, Int, Product } from '@web/schemas/generated/create-purchase-order.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useEffect, useState, useReducer, useRef } from 'react';
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
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useOrderQueries } from '@work-orders/common/queries/use-order-query.js';
import { createPurchaseOrderFromPurchaseOrder } from '@work-orders/common/create-purchase-order/from-purchase-order.js';
import {
  CreatePurchaseOrderDispatchProxy,
  useCreatePurchaseOrderReducer,
} from '@work-orders/common/create-purchase-order/reducer.js';
import type { PurchaseOrder } from '@web/services/purchase-orders/types.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useDraftOrderQueries } from '@work-orders/common/queries/use-draft-order-query.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';

const TODAY_DATE = new Date();
TODAY_DATE.setHours(0, 0, 0, 0);

// TODO: A new screen to view linked orders/workorders
// TODO: A way to link purchase order line items to draft SO line items
// TODO: a way to create a transfer order from a purchase order - but make sure it is linked somehow
export function PurchaseOrder({ initial }: { initial: CreatePurchaseOrder }) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useState('');
  const { Form } = useForm();

  const [createPurchaseOrder, dispatch, hasUnsavedChanges, setHasUnsavedChanges] = useCreatePurchaseOrderReducer(
    initial,
    { useReducer, useState, useRef },
  );

  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name: createPurchaseOrder.name });
  const purchaseOrder = purchaseOrderQuery.data;

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const router = useRouter();

  const screen = useScreen();
  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  const vendorSelectorWarningDialog = useVendorChangeWarningDialog(createPurchaseOrder, dispatch);
  const addProductPrerequisitesDialog = useAddProductPrerequisitesDialog(createPurchaseOrder, dispatch);

  const purchaseOrderMutation = usePurchaseOrderMutation(
    { fetch },
    {
      onSuccess: ({ purchaseOrder }) => {
        const message = createPurchaseOrder.name ? 'Purchase order updated' : 'Purchase order created';
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

  const productRows = useProductRows(
    createPurchaseOrder,
    purchaseOrder ?? null,
    dispatch,
    query,
    purchaseOrderMutation.isLoading,
  );

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

  const noLineItems = createPurchaseOrder.lineItems.length === 0;
  const allAreReceived = createPurchaseOrder.lineItems.every(li => li.availableQuantity === li.quantity);
  const noneAreReceived = createPurchaseOrder.lineItems.every(li => {
    const savedLineItem = purchaseOrder?.lineItems.find(hasPropertyValue('uuid', li.uuid));
    const minimumAvailableQuantity = savedLineItem?.availableQuantity ?? (0 as Int);
    return li.availableQuantity === minimumAvailableQuantity;
  });

  useEffect(() => {
    screen.setTitle(createPurchaseOrder.name ?? 'New purchase order');
  }, [createPurchaseOrder]);

  const placedDateIsToday = createPurchaseOrder.placedDate === TODAY_DATE.toISOString();

  return (
    <Form disabled={purchaseOrderMutation.isLoading}>
      <ScrollView>
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
              disabled={
                vendorSelectorWarningDialog.isVisible ||
                (!!createPurchaseOrder.name && createPurchaseOrder.vendorName !== null)
              }
            />

            {vendorCustomer?.metafields &&
              vendorCustomer.metafields.nodes.length > 0 &&
              vendorCustomer.metafields.nodes.map(({ definition, namespace, key, value }) => (
                <FormStringField
                  label={(definition?.name ?? `${namespace}.${key}`) + ' (metafield)'}
                  value={value}
                  disabled
                />
              ))}

            <FormStringField
              label={'Location'}
              onFocus={() => {
                router.push('LocationSelector', {
                  selection: {
                    type: 'select',
                    onSelect: location => dispatch.setLocation({ locationId: location?.id ?? null }),
                  },
                });
              }}
              disabled={!!createPurchaseOrder.name && createPurchaseOrder.locationId !== null}
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

            <DateField
              label={'Placed Date'}
              value={createPurchaseOrder.placedDate ?? undefined}
              onChange={(placedDate: string) => {
                const date = placedDate ? new Date(placedDate) : null;
                const isoString = date ? (date.toISOString() as DateTime) : null;
                dispatch.setPartial({ placedDate: isoString });
              }}
              disabled={purchaseOrderMutation.isLoading}
              action={
                createPurchaseOrder.placedDate
                  ? {
                      label: 'Remove',
                      onPress: () => dispatch.setPartial({ placedDate: null }),
                    }
                  : {
                      label: 'Today',
                      onPress: () => dispatch.setPartial({ placedDate: TODAY_DATE.toISOString() as DateTime }),
                      disabled: placedDateIsToday,
                    }
              }
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
                router.push('PurchaseOrderEmployeeSelector', {
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

            {Object.entries(createPurchaseOrder.customFields).map(([key, value]) => (
              <FormStringField
                key={key}
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
                  type: 'PURCHASE_ORDER',
                });
              }}
            />
          </ResponsiveGrid>
        </Stack>

        <Stack direction={'vertical'} paddingVertical={'Small'}>
          <ResponsiveGrid columns={2}>
            <ResponsiveGrid columns={1}>
              <FormButton title={'Add Product'} type={'primary'} onPress={addProductPrerequisitesDialog.show} />

              {noLineItems || allAreReceived ? (
                <FormButton
                  title={'Mark all as not received'}
                  type={'destructive'}
                  disabled={noLineItems || noneAreReceived}
                  onPress={() => {
                    for (const product of createPurchaseOrder.lineItems) {
                      const savedLineItem = purchaseOrder?.lineItems.find(li => li.uuid === product.uuid);
                      const minimumAvailableQuantity = savedLineItem?.availableQuantity ?? (0 as Int);
                      dispatch.updateProduct({
                        product: { ...product, availableQuantity: minimumAvailableQuantity as Int },
                      });
                    }
                  }}
                />
              ) : (
                <FormButton
                  title={'Mark all as received'}
                  disabled={noLineItems || allAreReceived}
                  onPress={() => {
                    for (const product of createPurchaseOrder.lineItems) {
                      dispatch.updateProduct({ product: { ...product, availableQuantity: product.quantity } });
                    }
                  }}
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
      </ScrollView>

      <ResponsiveStack
        direction={'vertical'}
        spacing={0.5}
        paddingHorizontal={'HalfPoint'}
        paddingVertical={'HalfPoint'}
        flex={0}
      >
        <ResponsiveGrid columns={4} smColumns={2} grow flex={0}>
          <FormButton
            title={'Transfer Products'}
            type={'basic'}
            action={'button'}
            disabled={!createPurchaseOrder.name || hasUnsavedChanges}
            onPress={() => {
              // TODO
            }}
          />

          <FormButton
            title={'Print'}
            type={'basic'}
            action={'button'}
            disabled={!createPurchaseOrder.name || hasUnsavedChanges}
            onPress={() => {
              if (createPurchaseOrder.name) {
                router.push('PurchaseOrderPrintOverview', {
                  name: createPurchaseOrder.name,
                });
              }
            }}
          />

          <FormButton
            title={createPurchaseOrder.name ? 'Update purchase order' : 'Create purchase order'}
            type={'primary'}
            onPress={() => purchaseOrderMutation.mutate(createPurchaseOrder)}
            loading={purchaseOrderMutation.isLoading}
            action={'submit'}
          />
        </ResponsiveGrid>

        {!createPurchaseOrder.name ||
          (hasUnsavedChanges && (
            <Stack direction="horizontal" alignment="center">
              <Text color="TextSubdued" variant="body">
                You must save your purchase order before you can print
              </Text>
            </Stack>
          ))}
      </ResponsiveStack>
    </Form>
  );
}

function useProductRows(
  { lineItems, locationId }: Pick<CreatePurchaseOrder, 'lineItems' | 'locationId'>,
  purchaseOrder: PurchaseOrder | null,
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

  const orderIds = unique(
    lineItems
      .map(lineItem => lineItem.shopifyOrderLineItem?.orderId)
      .filter(isNonNullable)
      .filter(id => parseGid(id).objectName === 'Order'),
  );

  const draftOrderIds = unique(
    lineItems
      .map(lineItem => lineItem.shopifyOrderLineItem?.orderId)
      .filter(isNonNullable)
      .filter(id => parseGid(id).objectName === 'DraftOrder'),
  );

  const orderQueries = {
    ...useOrderQueries({ fetch, ids: orderIds }),
    ...useDraftOrderQueries({ fetch, ids: draftOrderIds }),
  };

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
    const orderId = product.shopifyOrderLineItem?.orderId;
    const order = orderId ? orderQueries[orderId]?.data?.order ?? null : null;

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

        router.push('PurchaseOrderProductConfig', {
          product,
          locationId,
          onSave: product => dispatch.updateProduct({ product }),
          purchaseOrder,
        });
      },
      leftSide: {
        label: displayName,
        image: {
          source: imageUrl,
          badge: product.quantity,
        },
        subtitle: [`${product.availableQuantity} received`],
        badges: [order].filter(isNonNullable).map(order => ({ variant: 'highlight', text: order.name })),
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
          router.push('PurchaseOrderVendorSelector', {
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
      router.push('PurchaseOrderVendorSelector', {
        onSelect: vendorDetails => dispatch.setVendor(vendorDetails),
      });
    } else if (!hasLocation) {
      router.push('LocationSelector', {
        selection: {
          type: 'select',
          onSelect: location => dispatch.setLocation({ locationId: location?.id ?? null }),
        },
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

      router.push('PurchaseOrderProductSelector', {
        filters: { vendorName: createPurchaseOrder.vendorName, locationId: createPurchaseOrder.locationId },
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
