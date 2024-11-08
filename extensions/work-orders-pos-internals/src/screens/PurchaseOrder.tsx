import {
  Banner,
  DateField,
  List,
  ListRow,
  ScrollView,
  Stack,
  Text,
  TextArea,
  useApi,
} from '@shopify/ui-extensions-react/point-of-sale';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { CreatePurchaseOrder, DateTime, Product } from '@web/schemas/generated/create-purchase-order.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useEffect, useState, useReducer, useRef } from 'react';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { usePurchaseOrderMutation } from '@work-orders/common/queries/use-purchase-order-mutation.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useRouter } from '../routes.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { useDialog } from '@teifi-digital/pos-tools/providers/DialogProvider.js';
import { FormMoneyField } from '@teifi-digital/pos-tools/components/form/FormMoneyField.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { createPurchaseOrderFromPurchaseOrder } from '@work-orders/common/create-purchase-order/from-purchase-order.js';
import {
  CreatePurchaseOrderDispatchProxy,
  useCreatePurchaseOrderReducer,
} from '@work-orders/common/create-purchase-order/reducer.js';
import type { DetailedPurchaseOrder } from '@web/services/purchase-orders/types.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { getStockTransferLineItemStatusBadgeProps } from '../util/stock-transfer-line-item-status-badge-props.js';
import { getSpecialOrderBadge } from '../util/badges.js';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';
import { LinkedTasks } from '@work-orders/common-pos/components/LinkedTasks.js';
import {
  BaseNewPurchaseOrderReceiptButton,
  NewPurchaseOrderReceiptButton,
  PurchaseOrderReceipts,
} from '../components/purchase-orders/PurchaseOrderReceipts.js';

const TODAY_DATE = new Date();
TODAY_DATE.setHours(0, 0, 0, 0);

const PURCHASE_ORDER_TYPES: CreatePurchaseOrder['type'][] = ['NORMAL', 'DROPSHIP'];

// TODO: A new screen to view linked orders/workorders
// TODO: A way to link purchase order line items to draft SO line items
// TODO: a way to create a transfer order from a purchase order - but make sure it is linked somehow
export function PurchaseOrder({ initial }: { initial: CreatePurchaseOrder }) {
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useState('');

  const [createPurchaseOrder, dispatch, hasUnsavedChanges, setHasUnsavedChanges] = useCreatePurchaseOrderReducer(
    initial,
    { useReducer, useState, useRef },
  );

  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name: createPurchaseOrder.name });
  const purchaseOrder = purchaseOrderQuery.data;

  const { toast } = useApi<'pos.home.modal.render'>();

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

  // Default "Ship to" to selected location's address
  useEffect(() => {
    if (!selectedLocation) return;
    if (createPurchaseOrder.shipTo) return;
    dispatch.setPartial({ shipTo: selectedLocation.address?.formatted?.join('\n') ?? null });
  }, [selectedLocation]);

  const vendorsQuery = useVendorsQuery({ fetch });
  const vendorCustomer = vendorsQuery?.data?.find(vendor => vendor.name === createPurchaseOrder.vendorName)?.customer;

  // Default "Ship from" to vendor's default address
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
    purchaseOrderMutation.isPending,
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

  useEffect(() => {
    screen.setTitle(createPurchaseOrder.name ?? 'New purchase order');
  }, [createPurchaseOrder]);

  const placedDateIsToday = createPurchaseOrder.placedDate === TODAY_DATE.toISOString();

  return (
    <Form disabled={purchaseOrderMutation.isPending || !router.isCurrent}>
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
              <FormStringField label={'Purchase order ID'} disabled value={createPurchaseOrder.name} />
            )}
            <FormStringField
              label={'Type'}
              required
              value={sentenceCase(createPurchaseOrder.type)}
              onFocus={() =>
                router.push('ListPopup', {
                  title: 'Select type',
                  selection: {
                    type: 'select',
                    items: PURCHASE_ORDER_TYPES.map(type => ({
                      id: type,
                      leftSide: {
                        label: sentenceCase(type),
                      },
                    })),
                    onSelect: type => dispatch.setPartial({ type: type as (typeof PURCHASE_ORDER_TYPES)[number] }),
                  },
                })
              }
              helpText="Dropship orders do not count towards your inventory quantities."
            />

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
                  onSelect: location => dispatch.setLocation({ locationId: location.id }),
                });
              }}
              required
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
              value={createPurchaseOrder.status}
            />

            <DateField
              label={'Placed date'}
              value={createPurchaseOrder.placedDate ?? undefined}
              onChange={(placedDate: string) => {
                const date = placedDate ? new Date(placedDate) : null;
                const isoString = date ? (date.toISOString() as DateTime) : null;
                dispatch.setPartial({ placedDate: isoString });
              }}
              disabled={purchaseOrderMutation.isPending}
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
              label={'Ship from'}
              value={createPurchaseOrder.shipFrom ?? ''}
              onChange={(shipFrom: string) => dispatch.setPartial({ shipFrom })}
            />
            {!!vendorCustomer?.defaultAddress?.formatted &&
              createPurchaseOrder.shipFrom !== vendorCustomer.defaultAddress.formatted.join('\n') && (
                <FormButton
                  title={'Use vendor address'}
                  onPress={() => {
                    if (!vendorCustomer.defaultAddress) return;
                    dispatch.setPartial({ shipFrom: vendorCustomer.defaultAddress.formatted.join('\n') });
                  }}
                />
              )}
          </ResponsiveGrid>
          <ResponsiveGrid columns={1}>
            <TextArea
              label={'Ship to'}
              value={createPurchaseOrder.shipTo ?? ''}
              onChange={(shipTo: string) => dispatch.setPartial({ shipTo })}
              disabled={purchaseOrderMutation.isPending}
            />
            {createPurchaseOrder.type === 'NORMAL' &&
              !!selectedLocation?.address?.formatted &&
              createPurchaseOrder.shipTo !== selectedLocation.address.formatted.join('\n') && (
                <FormButton
                  title={'Use location address'}
                  onPress={() => dispatch.setPartial({ shipTo: selectedLocation.address.formatted.join('\n') })}
                />
              )}
            {createPurchaseOrder.type === 'DROPSHIP' && (
              <FormButton
                title={'Select customer address'}
                onPress={() => {
                  router.push('CustomerSelector', {
                    onSelect: customer => {
                      if (!customer.defaultAddress) {
                        toast.show('This customer has no known address');
                        return;
                      }

                      dispatch.setPartial({ shipTo: customer.defaultAddress.formatted.join('\n') });
                    },
                  });
                }}
              />
            )}
          </ResponsiveGrid>

          <ResponsiveGrid columns={1}>
            <TextArea
              label={'Note'}
              value={createPurchaseOrder.note}
              onChange={(note: string) => dispatch.setPartial({ note })}
              disabled={purchaseOrderMutation.isPending}
            />
          </ResponsiveGrid>
        </ResponsiveGrid>

        <Stack direction={'vertical'} paddingVertical={'Small'}>
          <ResponsiveGrid columns={3}>
            <FormStringField
              label={'Assigned employees'}
              value={
                Object.values(employeeQueries).some(query => query.isLoading)
                  ? 'Loading...'
                  : createPurchaseOrder.employeeAssignments
                      .map(({ employeeId }) => employeeQueries[employeeId]?.data?.name ?? 'Unknown employee')
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
              title={'Custom fields'}
              onPress={() => {
                router.push('CustomFieldConfig', {
                  title: 'Purchase order custom fields',
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
              <FormButton title={'Add product'} type={'primary'} onPress={addProductPrerequisitesDialog.show} />
              {!!createPurchaseOrder.name && !hasUnsavedChanges ? (
                <NewPurchaseOrderReceiptButton
                  purchaseOrderName={createPurchaseOrder.name}
                  disabled={hasUnsavedChanges}
                  props={{ title: 'Receive products' }}
                />
              ) : (
                <BaseNewPurchaseOrderReceiptButton disabled title="Receive products" />
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
              <FormMoneyField label={'Balance due'} value={balanceDue.toMoney()} disabled />
            </ResponsiveGrid>
          </ResponsiveGrid>

          <PurchaseOrderReceipts
            purchaseOrderName={createPurchaseOrder.name}
            disabled={purchaseOrderMutation.isPending}
            action={
              !!createPurchaseOrder.name && !hasUnsavedChanges ? (
                <NewPurchaseOrderReceiptButton
                  purchaseOrderName={createPurchaseOrder.name}
                  disabled={hasUnsavedChanges}
                />
              ) : (
                <BaseNewPurchaseOrderReceiptButton disabled />
              )
            }
          />

          <LinkedTasks
            links={{ purchaseOrders: [createPurchaseOrder.name].filter(isNonNullable) }}
            disabled={purchaseOrderMutation.isPending}
            useRouter={useRouter}
          />
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
            title={'Transfer'}
            type={'basic'}
            action={'button'}
            disabled={!createPurchaseOrder.name || hasUnsavedChanges}
            onPress={() => {
              if (!createPurchaseOrder.name) {
                toast.show('You must save your purchase order before you can transfer products');
                return;
              }

              router.push('SelectPurchaseOrderProductsToTransfer', {
                name: createPurchaseOrder.name,
              });
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
            loading={purchaseOrderMutation.isPending}
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
  { name, lineItems, locationId }: Pick<CreatePurchaseOrder, 'name' | 'lineItems' | 'locationId'>,
  purchaseOrder: DetailedPurchaseOrder | null,
  dispatch: CreatePurchaseOrderDispatchProxy,
  query: string,
  disabled: boolean,
) {
  query = query.trim();

  const { toast } = useApi<'pos.home.modal.render'>();
  const fetch = useAuthenticatedFetch();
  const router = useRouter();

  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name });
  const productVariantIds = unique(lineItems.map(product => product.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  // TODO: TO/SO info

  const getDisplayName = (product: Product) => {
    const variant = productVariantQueries[product.productVariantId]?.data ?? null;
    return getProductVariantName(variant) ?? 'Unknown product';
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

    const savedLineItem = purchaseOrder?.lineItems.find(hasPropertyValue('uuid', product.uuid));

    const receivedQuantity =
      purchaseOrder?.receipts
        .flatMap(receipt => receipt.lineItems)
        .filter(hasPropertyValue('uuid', product.uuid))
        .map(li => li.quantity)
        .reduce((a, b) => a + b, 0) ?? 0;

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
        subtitle: getSubtitle([product.serialNumber, `${receivedQuantity} received`]),
        badges: [
          product.specialOrderLineItem
            ? getSpecialOrderBadge({ name: product.specialOrderLineItem.name, items: [] }, false)
            : null,
          ...(savedLineItem?.stockTransferLineItems?.map(({ status, stockTransferName, quantity }) =>
            getStockTransferLineItemStatusBadgeProps({
              status,
              quantity,
              name: stockTransferName,
            }),
          ) ?? []),
        ].filter(isNonNullable),
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
          title: 'Vendor already set',
          type: 'alert',
          content: 'Are you certain you want to change the vendor? This will clear the products.',
          actionText: 'Change vendor',
          showSecondaryAction: true,
          secondaryActionText: 'Cancel',
        },
      });
    },
  };
};

const useAddProductPrerequisitesDialog = (
  createPurchaseOrder: Pick<CreatePurchaseOrder, 'name' | 'lineItems' | 'locationId' | 'vendorName'>,
  dispatch: CreatePurchaseOrderDispatchProxy,
) => {
  const dialog = useDialog();
  const { toast } = useApi<'pos.home.modal.render'>();
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
        onSelect: location => dispatch.setLocation({ locationId: location.id }),
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
        createPurchaseOrder,
      });
    }
  };

  const subject = !hasVendor ? 'vendor' : 'location';
  const title = sentenceCase(`Select ${subject}`);
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
      label={sentenceCase(field)}
      value={createPurchaseOrder[field]}
      onChange={value => dispatch.setPartial({ [field]: value })}
    />
  );
}
