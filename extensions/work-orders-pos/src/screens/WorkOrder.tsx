import {
  Banner,
  Button,
  DateField,
  List,
  ListRow,
  NumberField,
  ScrollView,
  Stack,
  Text,
  TextArea,
  TextField,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import type { CreateWorkOrder, DateTime } from '@web/schemas/generated/create-work-order.js';
import type { CalculateDraftOrderResponse } from '@web/controllers/api/work-order.js';
import { workOrderToCreateWorkOrder } from '../dto/work-order-to-create-work-order.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { useSaveWorkOrderMutation } from '@work-orders/common/queries/use-save-work-order-mutation.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useCreateWorkOrderReducer } from '../create-work-order/reducer.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { CreateWorkOrderCharge, CreateWorkOrderLineItem } from '../types.js';
import { Money } from '@web/services/gql/queries/generated/schema.js';
import { getChargesPrice } from '../create-work-order/charges.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../routes.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { usePaymentHandler } from '../hooks/use-payment-handler.js';

/**
 * Stuff to pass around between components
 */
type WorkOrderContext = ReturnType<typeof useWorkOrderContext>;

const useWorkOrderContext = ({ initial }: { initial?: Partial<CreateWorkOrder> }) => {
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [createWorkOrder, dispatchCreateWorkOrder] = useCreateWorkOrderReducer(initial);
  const fetch = useAuthenticatedFetch();
  const api = useExtensionApi<'pos.home.modal.render'>();
  const settingsQuery = useSettingsQuery({ fetch });
  const router = useRouter();
  const paymentHandler = usePaymentHandler();

  const [shouldOpenSavedPopup, setShouldOpenSavedPopup] = useState(false);

  const workOrderQuery = useWorkOrderQuery(
    { fetch, name: createWorkOrder.name },
    {
      onSuccess({ workOrder }) {
        if (!workOrder) return;

        dispatchCreateWorkOrder({
          type: 'set-work-order',
          workOrder: workOrderToCreateWorkOrder(workOrder),
        });
        setUnsavedChanges(false);

        if (shouldOpenSavedPopup) {
          router.push('WorkOrderSaved', { workOrder });
          setShouldOpenSavedPopup(false);
        }
      },
      onError() {
        api.toast.show('Error loading work order');
        router.popAll();
      },
    },
  );

  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      lineItems: createWorkOrder.lineItems ?? [],
      charges: createWorkOrder.charges ?? [],
      customerId: createWorkOrder.customerId,
      discount: createWorkOrder.discount,
    },
    {
      enabled: !createWorkOrder.name || workOrderQuery.data?.workOrder?.order.type !== 'order',
    },
  );

  const saveWorkOrderMutation = useSaveWorkOrderMutation(
    { fetch },
    {
      onMutate() {
        api.toast.show('Saving work order', { duration: 1000 });
      },
      onError() {
        api.toast.show('Error saving work order');
      },
      onSuccess(workOrder) {
        if (!workOrder.name) return;
        setUnsavedChanges(false);
        dispatchCreateWorkOrder({ type: 'set-work-order', workOrder: { ...createWorkOrder, name: workOrder.name } });
      },
    },
  );

  return {
    createWorkOrder,
    dispatchCreateWorkOrder: (...[action]: Parameters<typeof dispatchCreateWorkOrder>) => {
      setUnsavedChanges(action.type !== 'reset-work-order');
      dispatchCreateWorkOrder(action);
    },
    unsavedChanges,
    calculatedDraftOrderQuery,
    saveWorkOrderMutation,
    workOrderQuery,
    setShouldOpenSavedPopup,
    hasOrder: workOrderQuery.data?.workOrder?.order.type === 'order',
    settingsQuery,
    paymentHandler,
  };
};

export function WorkOrder({ initial }: { initial?: Partial<CreateWorkOrder> }) {
  const context = useWorkOrderContext({ initial });

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges: context.unsavedChanges });

  const screen = useScreen();
  screen.setTitle(context.createWorkOrder.name ?? 'New Work Order');
  screen.setIsLoading(
    context.workOrderQuery.isFetching ||
      context.saveWorkOrderMutation.isLoading ||
      context.paymentHandler.isLoading ||
      context.settingsQuery.isLoading,
  );
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  const currencyFormatter = useCurrencyFormatter();

  let bannerText: string | null = null;

  if (context.hasOrder) {
    const order = context.workOrderQuery.data?.workOrder?.order;

    if (order) {
      const isFullyPaid = BigDecimal.fromMoney(order.outstanding).equals(BigDecimal.ZERO);
      const paymentText = isFullyPaid
        ? 'paid in full'
        : `partially paid (${currencyFormatter(order.received)} / ${currencyFormatter(order.total)})`;
      bannerText = `This order has been ${paymentText} through order ${context.workOrderQuery.data?.workOrder?.order?.name}. You can no longer change the products and services within this order`;
    }
  }
  return (
    <ScrollView>
      {bannerText && <Banner title={bannerText} variant={'information'} visible />}

      {context.saveWorkOrderMutation.isError && (
        <Banner
          title={
            'Error saving work order: ' + extractErrorMessage(context.saveWorkOrderMutation.error, 'Unknown error')
          }
          variant={'error'}
          visible
        />
      )}

      <WorkOrderProperties context={context} />

      <Stack direction="horizontal" flexChildren>
        <ResponsiveGrid columns={2}>
          <WorkOrderItems context={context} />

          <ResponsiveGrid columns={1}>
            <WorkOrderDescription context={context} />
            <WorkOrderAssignment context={context} />
            <WorkOrderMoney context={context} />
          </ResponsiveGrid>
        </ResponsiveGrid>
      </Stack>

      <Stack direction="horizontal" flexChildren paddingVertical={'ExtraLarge'}>
        <ShowDerivedFromOrderPreviewButton context={context} />
        {!context.hasOrder && (
          <Button
            title={'Pay Balance'}
            onPress={async () => {
              const name = await context.saveWorkOrderMutation
                .mutateAsync(context.createWorkOrder)
                .then(result => result.name);

              if (!name) {
                return;
              }

              const result = await context.workOrderQuery.refetch();
              const workOrder = result.data?.workOrder;

              if (!workOrder) {
                return;
              }

              await context.paymentHandler.handlePayment({ workOrder });
            }}
          />
        )}
        <Button
          title={context.createWorkOrder.name ? 'Update Work Order' : 'Create Work Order'}
          type="primary"
          onPress={() =>
            context.saveWorkOrderMutation.mutate(context.createWorkOrder, {
              onSuccess: response => {
                if (!response.errors) {
                  context.setShouldOpenSavedPopup(true);
                }
              },
            })
          }
          isDisabled={context.saveWorkOrderMutation.isLoading}
        />
      </Stack>
    </ScrollView>
  );
}

function WorkOrderDescription({ context }: { context: WorkOrderContext }) {
  return (
    <TextArea
      rows={3}
      label="Description"
      value={context.createWorkOrder.description}
      onChange={(value: string) => context.dispatchCreateWorkOrder({ type: 'set-field', field: 'description', value })}
      error={context.saveWorkOrderMutation.data?.errors?.description ?? ''}
    />
  );
}

function ShowDerivedFromOrderPreviewButton({ context }: { context: WorkOrderContext }) {
  const router = useRouter();

  if (!context.workOrderQuery.data?.workOrder?.derivedFromOrder) {
    return null;
  }

  const { derivedFromOrder } = context.workOrderQuery.data.workOrder;

  const title = `View Previous (${[derivedFromOrder.name, derivedFromOrder.workOrderName]
    .filter(Boolean)
    .join(' - ')})`;

  // TODO: If derived from a work order, perhaps navigate to the work order instead of the order preview? Or just a work order preview

  return (
    <Button
      title={title}
      onPress={() =>
        router.push('OrderPreview', {
          orderId: derivedFromOrder.id,
          unsavedChanges: context.unsavedChanges,
          showImportButton: false,
        })
      }
    />
  );
}

const WorkOrderProperties = ({ context }: { context: WorkOrderContext }) => {
  const router = useRouter();

  const fetch = useAuthenticatedFetch();
  const customerQuery = useCustomerQuery({ fetch, id: context.createWorkOrder.customerId });
  const customerValue = context.createWorkOrder.customerId
    ? customerQuery.isLoading
      ? 'Loading...'
      : customerQuery.data?.displayName ?? 'Unknown'
    : null;

  return (
    <ResponsiveGrid columns={4} grow>
      {context.workOrderQuery?.data?.workOrder?.name && (
        <TextField label="Work Order ID" disabled value={context.workOrderQuery?.data?.workOrder?.name} />
      )}
      {context.workOrderQuery?.data?.workOrder?.derivedFromOrder &&
        (context.workOrderQuery.data.workOrder.derivedFromOrder.workOrderName ? (
          <TextField
            label="Previous Work Order"
            disabled
            value={context.workOrderQuery.data.workOrder.derivedFromOrder.workOrderName}
          />
        ) : (
          <TextField
            label="Previous Order"
            disabled
            value={context.workOrderQuery.data.workOrder.derivedFromOrder.name}
          />
        ))}
      <TextField
        label="Status"
        required
        placeholder="Status"
        onFocus={() =>
          router.push('StatusSelector', {
            onSelect: status => context.dispatchCreateWorkOrder({ type: 'set-field', field: 'status', value: status }),
          })
        }
        value={context.createWorkOrder.status ?? ''}
        error={context.saveWorkOrderMutation.data?.errors?.status ?? ''}
      />
      <TextField
        label="Customer"
        required
        placeholder="Customer"
        disabled={context.hasOrder}
        onFocus={() =>
          router.push('CustomerSelector', {
            onSelect: customerId =>
              context.dispatchCreateWorkOrder({ type: 'set-field', field: 'customerId', value: customerId }),
          })
        }
        value={customerValue}
        error={context.saveWorkOrderMutation.data?.errors?.customerId ?? ''}
      />
    </ResponsiveGrid>
  );
};

const WorkOrderItems = ({ context }: { context: WorkOrderContext }) => {
  const [query, setQuery] = useState('');

  const router = useRouter();

  const rows = useItemRows(context, query);

  return (
    <ResponsiveGrid columns={1}>
      <ResponsiveGrid columns={2}>
        <Button
          title="Add Product"
          type="primary"
          onPress={() =>
            router.push('ProductSelector', {
              onSelect: ({ lineItem, charges }) => {
                // TODO: Charge reduce types instead of set-field everywhere
                context.dispatchCreateWorkOrder({
                  type: 'set-field',
                  field: 'charges',
                  value: [...(context.createWorkOrder.charges ?? []), ...charges],
                });

                context.dispatchCreateWorkOrder({ type: 'upsert-line-item', lineItem, isUnstackable: false });
              },
            })
          }
          isDisabled={context.hasOrder}
        />
        <Button
          title="Add Service"
          type="primary"
          onPress={() =>
            router.push('ServiceSelector', {
              onSelect: ({ type, lineItem, charges }) => {
                const isUnstackable = type === 'mutable-service';

                const createWorkOrderCharges = [...(context.createWorkOrder.charges ?? []), ...charges];

                context.dispatchCreateWorkOrder({
                  type: 'set-field',
                  field: 'charges',
                  value: createWorkOrderCharges,
                });

                context.dispatchCreateWorkOrder({ type: 'upsert-line-item', lineItem, isUnstackable });

                if (type === 'mutable-service') {
                  router.push('LabourLineItemConfig', {
                    hasBasePrice: false,
                    labour: context.createWorkOrder.charges?.filter(ea => ea.lineItemUuid === lineItem.uuid) ?? [],
                    readonly: context.hasOrder,
                    lineItem,
                    onRemove: () => removeLineItem(context, lineItem),
                    onUpdate: labour =>
                      updateLineItemCharges({ context, lineItem, charges: labour, isUnstackable: true }),
                  });
                }
              },
            })
          }
          isDisabled={context.hasOrder}
        />
      </ResponsiveGrid>
      <ControlledSearchBar placeholder="Search items" value={query} onTextChange={setQuery} onSearch={() => {}} />
      {rows.length ? (
        <List data={rows} imageDisplayStrategy={'always'}></List>
      ) : (
        <Stack direction="horizontal" alignment="center" paddingVertical={'Large'}>
          <Text variant="body" color="TextSubdued">
            No products or services added to work order
          </Text>
        </Stack>
      )}
    </ResponsiveGrid>
  );
};

const WorkOrderMoney = ({ context }: { context: WorkOrderContext }) => {
  const { toast } = useExtensionApi<'pos.home.modal.render'>();
  const router = useRouter();
  const currencyFormatter = useCurrencyFormatter();

  const { calculateDraftOrderResponse } = context.calculatedDraftOrderQuery.data ?? {};
  const isLoading = context.calculatedDraftOrderQuery.isLoading;

  const getFormattedCalculatedMoney = (
    key: {
      [K in keyof CalculateDraftOrderResponse]: CalculateDraftOrderResponse[K] extends Money ? K : never;
    }[keyof CalculateDraftOrderResponse],
  ) =>
    isLoading
      ? 'Loading...'
      : calculateDraftOrderResponse?.[key]
        ? currencyFormatter(calculateDraftOrderResponse[key])
        : '-';

  const receivedBigDecimal = context.workOrderQuery?.data?.workOrder?.order?.received
    ? BigDecimal.fromMoney(context.workOrderQuery?.data?.workOrder?.order?.received)
    : BigDecimal.ZERO;
  const totalPriceBigDecimal = context.workOrderQuery?.data?.workOrder?.order?.total
    ? BigDecimal.fromMoney(context.workOrderQuery?.data?.workOrder?.order?.total)
    : calculateDraftOrderResponse?.totalPrice
      ? BigDecimal.fromMoney(calculateDraftOrderResponse?.totalPrice)
      : BigDecimal.ZERO;
  const outstandingBigDecimal = totalPriceBigDecimal.subtract(receivedBigDecimal);

  const outstanding = currencyFormatter(outstandingBigDecimal.toMoney());
  const total = currencyFormatter(totalPriceBigDecimal.toMoney());
  const received = currencyFormatter(
    context.workOrderQuery.data?.workOrder?.order?.received ?? BigDecimal.ZERO.toMoney(),
  );

  const discountValue = calculateDraftOrderResponse?.appliedDiscount
    ? {
        FIXED_AMOUNT: currencyFormatter(calculateDraftOrderResponse.appliedDiscount.value),
        PERCENTAGE: `${calculateDraftOrderResponse.appliedDiscount.value}% (${currencyFormatter(
          calculateDraftOrderResponse.appliedDiscount.amount,
        )})`,
      }[calculateDraftOrderResponse.appliedDiscount.valueType]
    : '-';

  return (
    <Stack direction="vertical" flex={1}>
      <Stack direction="vertical" flex={1}>
        <Stack direction={'horizontal'} flexChildren flex={1}>
          <NumberField
            label={'Discount'}
            value={discountValue}
            disabled={!calculateDraftOrderResponse || context.hasOrder}
            onFocus={() => {
              const subTotal = calculateDraftOrderResponse
                ? calculateDraftOrderResponse.subtotalPrice
                : BigDecimal.ZERO.toMoney();

              router.push('DiscountSelector', {
                subTotal,
                onSelect: discount => {
                  context.dispatchCreateWorkOrder({
                    type: 'set-field',
                    field: 'discount',
                    value: discount,
                  });

                  toast.show('Applying discount', { duration: 1000 });
                },
              });
            }}
          />
          <NumberField label="Subtotal" disabled value={getFormattedCalculatedMoney('subtotalPrice')} />
        </Stack>
        <Stack direction={'horizontal'} flexChildren flex={1}>
          <NumberField label="Tax" disabled value={getFormattedCalculatedMoney('totalTax')} />
          <NumberField label="Total" disabled value={getFormattedCalculatedMoney('totalPrice')} />
        </Stack>
      </Stack>

      <Stack direction="vertical" flexChildren flex={1}>
        <Stack direction={'vertical'}>
          <Stack direction={'horizontal'} flexChildren flex={1}>
            <NumberField label={'Paid'} disabled={true} value={received} />
            <NumberField label="Balance Due" disabled value={outstanding} />
          </Stack>
          {context.hasOrder && outstandingBigDecimal.compare(BigDecimal.ZERO) > 0 && (
            <Banner
              title={`This order has been partially paid (${received} / ${total}). The remaining balance can be paid through order ${context.workOrderQuery.data?.workOrder?.order?.name}`}
              variant={'information'}
              visible
            />
          )}
        </Stack>
      </Stack>
    </Stack>
  );
};

const WorkOrderAssignment = ({ context }: { context: WorkOrderContext }) => {
  const selectedEmployeeIds = unique(
    context.createWorkOrder.charges?.map(employee => employee.employeeId).filter(isNonNullable) ?? [],
  );

  const fetch = useAuthenticatedFetch();
  const employeeQueries = useEmployeeQueries({ fetch, ids: selectedEmployeeIds });
  const selectedEmployeeNames = selectedEmployeeIds
    .map(employeeId => employeeQueries[employeeId]?.data?.name ?? 'Unknown Employee')
    .join('\n');

  const setDueDate = (date: string) => {
    const dueDate = new Date(date);
    const dueDateUtc = new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60 * 1000);
    context.dispatchCreateWorkOrder({
      type: 'set-field',
      field: 'dueDate',
      value: dueDateUtc.toISOString() as DateTime,
    });
  };

  return (
    <Stack direction="vertical" flex={1} flexChildren>
      <TextArea
        rows={Math.max(1, selectedEmployeeIds.length) - 1}
        disabled
        label="Assigned Employees"
        value={selectedEmployeeNames}
        error={context.saveWorkOrderMutation.data?.errors?.description ?? ''}
      />
      <DateField
        label="Due date"
        value={context.createWorkOrder.dueDate}
        onChange={setDueDate}
        error={context.saveWorkOrderMutation.data?.errors?.dueDate ?? ''}
      />
    </Stack>
  );
};

function useItemRows(context: WorkOrderContext, query: string): ListRow[] {
  const fetch = useAuthenticatedFetch();
  const currencyFormatter = useCurrencyFormatter();

  const productVariantQueries = useProductVariantQueries({
    fetch,
    ids: context.createWorkOrder.lineItems?.map(li => li.productVariantId) ?? [],
  });

  const router = useRouter();

  return (
    context.createWorkOrder.lineItems
      ?.map(lineItem => ({ lineItem, productVariant: productVariantQueries[lineItem.productVariantId]?.data ?? null }))
      ?.filter(
        ({ productVariant }) =>
          !query || getProductVariantName(productVariant)?.toLowerCase().includes(query.toLowerCase()),
      )
      ?.map<ListRow>(({ lineItem, productVariant }) => {
        const isMutableServiceItem = productVariant?.product.isMutableServiceItem ?? false;

        const basePrice = productVariant && !isMutableServiceItem ? productVariant.price : BigDecimal.ZERO.toMoney();

        const labourPrice = getChargesPrice(
          context.createWorkOrder.charges?.filter(assignment => assignment.lineItemUuid === lineItem.uuid) ?? [],
        );

        const hasLabour = context.createWorkOrder.charges?.some(ea => ea.lineItemUuid === lineItem.uuid);

        return {
          id: lineItem.uuid,
          onPress() {
            if (!productVariant || !lineItem) return;

            const hasCharges = context.createWorkOrder.charges?.some(ea => ea.lineItemUuid === lineItem.uuid);

            if (hasCharges || productVariant.product.isMutableServiceItem) {
              router.push('LabourLineItemConfig', {
                hasBasePrice: !productVariant.product.isMutableServiceItem,
                labour: context.createWorkOrder.charges?.filter(ea => ea.lineItemUuid === lineItem.uuid) ?? [],
                readonly: context.hasOrder,
                lineItem,
                onRemove: () => removeLineItem(context, lineItem),
                onUpdate: labour =>
                  updateLineItemCharges({
                    context,
                    lineItem,
                    charges: labour,
                    isUnstackable: productVariant.product.isMutableServiceItem,
                  }),
              });
              return;
            }

            router.push('ProductLineItemConfig', {
              canAddLabour: !productVariant.product.isFixedServiceItem,
              readonly: context.hasOrder,
              lineItem,
              onAssignLabour: lineItem =>
                router.push('LabourLineItemConfig', {
                  hasBasePrice: true,
                  labour: context.createWorkOrder.charges?.filter(ea => ea.lineItemUuid === lineItem.uuid) ?? [],
                  readonly: context.hasOrder,
                  lineItem,
                  onRemove: () => removeLineItem(context, lineItem),
                  onUpdate: labour =>
                    updateLineItemCharges({ context, lineItem, charges: labour, isUnstackable: false }),
                }),
              onRemove: () => removeLineItem(context, lineItem),
              onUpdate: lineItem =>
                context.dispatchCreateWorkOrder({
                  type: 'upsert-line-item',
                  lineItem,
                  isUnstackable: false,
                }),
            });
          },
          leftSide: {
            label: getProductVariantName(productVariant) ?? 'Unknown item',
            subtitle: productVariant?.sku ? [productVariant.sku] : undefined,
            image: {
              source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
              badge: productVariant?.product.isMutableServiceItem || hasLabour ? undefined : lineItem.quantity,
            },
          },
          rightSide: {
            label: currencyFormatter(
              BigDecimal.fromMoney(basePrice)
                .add(BigDecimal.fromMoney(labourPrice))
                .multiply(BigDecimal.fromString(lineItem.quantity.toFixed(0)))
                .toMoney(),
            ),
            showChevron: true,
          },
        };
      }) ?? []
  );
}

function removeLineItem(context: WorkOrderContext, lineItem: CreateWorkOrderLineItem) {
  // TODO: Use proxy pattern
  context.dispatchCreateWorkOrder({
    type: 'remove-line-item',
    lineItem,
  });

  context.dispatchCreateWorkOrder({
    type: 'set-field',
    field: 'charges',
    value: context.createWorkOrder.charges?.filter(l => l.lineItemUuid !== lineItem.uuid) ?? [],
  });
}

function updateLineItemCharges({
  context,
  lineItem,
  charges,
  isUnstackable,
}: {
  context: WorkOrderContext;
  lineItem: CreateWorkOrderLineItem;
  charges: DiscriminatedUnionOmit<CreateWorkOrderCharge, 'lineItemUuid'>[];
  isUnstackable: boolean;
}) {
  context.dispatchCreateWorkOrder({
    type: 'set-field',
    field: 'charges',
    value: [
      ...(context.createWorkOrder.charges?.filter(l => l.lineItemUuid !== lineItem.uuid) ?? []),
      ...charges.map(l => ({ ...l, lineItemUuid: lineItem.uuid })),
    ],
  });

  context.dispatchCreateWorkOrder({
    type: 'upsert-line-item',
    lineItem,
    isUnstackable,
  });
}
