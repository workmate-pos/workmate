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
  useCartSubscription,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useScreen } from '../hooks/use-screen.js';
import { useCurrencyFormatter } from '../hooks/use-currency-formatter.js';
import type { DateTime } from '@web/schemas/generated/create-work-order.js';
import type { CalculateDraftOrderResponse } from '@web/controllers/api/work-order.js';
import { defaultCreateWorkOrder } from '../create-work-order/default.js';
import { workOrderToCreateWorkOrder } from '../dto/work-order-to-create-work-order.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { useSaveWorkOrderMutation } from '@work-orders/common/queries/use-save-work-order-mutation.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useCreateWorkOrderReducer } from '../create-work-order/reducer.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { PayButton } from '../components/PayButton.js';
import { CreateWorkOrderLineItem, ScreenInputOutput } from './routes.js';
import { useUnsavedChangesDialog } from '@work-orders/common-pos/hooks/use-unsaved-changes-dialog.js';
import { Money } from '@web/services/gql/queries/generated/schema.js';
import { ControlledSearchBar } from '@work-orders/common-pos/components/ControlledSearchBar.js';
import { getChargesPrice } from '../create-work-order/charges.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { extractErrorMessage } from '@work-orders/common-pos/util/errors.js';
import { useSettings } from '../providers/SettingsProvider.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { ResponsiveGrid } from '@work-orders/common-pos/components/ResponsiveGrid.js';

/**
 * Stuff to pass around between components
 */
type WorkOrderContext = ReturnType<typeof useWorkOrderContext>;

const useWorkOrderContext = () => {
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [title, setTitle] = useState('');
  const [createWorkOrder, dispatchCreateWorkOrder] = useCreateWorkOrderReducer();
  const fetch = useAuthenticatedFetch();
  const api = useExtensionApi<'pos.home.modal.render'>();
  const cart = useCartSubscription();
  const settings = useSettings();

  const { Screen, usePopup, navigate } = useScreen('WorkOrder', async action => {
    switch (action.type) {
      case 'new-work-order': {
        setTitle('New Work Order');

        if (action.initial) {
          dispatchCreateWorkOrder({
            type: 'set-work-order',
            workOrder: {
              ...defaultCreateWorkOrder,
              ...action.initial,
            },
          });
        } else {
          dispatchCreateWorkOrder({ type: 'reset-work-order' });

          if (cart.customer) {
            dispatchCreateWorkOrder({
              type: 'set-field',
              field: 'customerId',
              value: createGid('Customer', String(cart.customer.id)),
            });
            api.toast.show('Imported customer from cart');
          }
        }

        const defaultStatus = settings.defaultStatus;

        if (defaultStatus) {
          dispatchCreateWorkOrder({
            type: 'set-field',
            field: 'status',
            value: defaultStatus,
          });
        }

        break;
      }

      case 'load-work-order': {
        setTitle(`Edit Work Order ${action.name}`);

        dispatchCreateWorkOrder({
          type: 'set-work-order',
          workOrder: {
            ...defaultCreateWorkOrder,
            name: action.name,
          },
        });

        break;
      }

      default: {
        return action satisfies never;
      }
    }
  });

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

        if (shouldOpenSavedPopup) {
          workOrderSavedPopup.navigate(workOrder);
          setShouldOpenSavedPopup(false);
        }
      },
      onError() {
        api.toast.show('Error loading work order');
        navigate('Entry');
      },
    },
  );

  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery({
    fetch,
    lineItems: createWorkOrder.lineItems ?? [],
    charges: createWorkOrder.charges ?? [],
    customerId: createWorkOrder.customerId,
    discount: createWorkOrder.discount,
  });

  const workOrderSavedPopup = usePopup('WorkOrderSaved', () => {
    setUnsavedChanges(false);
  });

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
        setShouldOpenSavedPopup(true);
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
    Screen,
    title,
    usePopup,
    navigate,
    calculatedDraftOrderQuery,
    saveWorkOrderMutation,
    workOrderQuery,
    hasOrder: workOrderQuery.data?.workOrder?.order.type === 'order',
  };
};

export function WorkOrderPage() {
  const context = useWorkOrderContext();
  const { Screen } = context;

  const [paymentLoading, setPaymentLoading] = useState(false);
  const unsavedChangesDialog = useUnsavedChangesDialog({
    hasUnsavedChanges: context.unsavedChanges,
    onAction: () => {
      context.dispatchCreateWorkOrder({ type: 'reset-work-order' });
      context.navigate('Entry');
    },
  });

  return (
    <Screen
      title={context.title}
      isLoading={context.workOrderQuery.isFetching || context.saveWorkOrderMutation.isLoading || paymentLoading}
      overrideNavigateBack={unsavedChangesDialog.show}
    >
      <ScrollView>
        {context.hasOrder && (
          <Banner
            title={`This order has been (partially) paid through order ${context.workOrderQuery.data?.workOrder?.order?.name}. You can no longer change the products and services within this order`}
            variant={'information'}
            visible
          />
        )}

        {context.saveWorkOrderMutation.isError && (
          <Banner
            title={'Error saving work order: ' + extractErrorMessage(context.saveWorkOrderMutation.error, '')}
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
            <PayButton createWorkOrder={context.createWorkOrder} workOrderName={null} setLoading={setPaymentLoading} />
          )}
          <Button
            title={context.createWorkOrder.name ? 'Update Work Order' : 'Create Work Order'}
            type="primary"
            onPress={() => context.saveWorkOrderMutation.mutate(context.createWorkOrder)}
            isDisabled={context.saveWorkOrderMutation.isLoading}
          />
        </Stack>
      </ScrollView>
    </Screen>
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
        context.navigate('OrderPreview', {
          orderId: derivedFromOrder.id,
          unsavedChanges: context.unsavedChanges,
          showImportButton: false,
        })
      }
    />
  );
}

const WorkOrderProperties = ({ context }: { context: WorkOrderContext }) => {
  const statusSelectorPopup = context.usePopup('StatusSelector', result =>
    context.dispatchCreateWorkOrder({
      type: 'set-field',
      field: 'status',
      value: result,
    }),
  );

  const customerSelectorPopup = context.usePopup('CustomerSelector', result =>
    context.dispatchCreateWorkOrder({
      type: 'set-field',
      field: 'customerId',
      value: result,
    }),
  );

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
        onFocus={() => statusSelectorPopup.navigate()}
        value={context.createWorkOrder.status ?? ''}
        error={context.saveWorkOrderMutation.data?.errors?.status ?? ''}
      />
      <TextField
        label="Customer"
        required
        placeholder="Customer"
        disabled={context.hasOrder}
        onFocus={() => customerSelectorPopup.navigate()}
        value={customerValue}
        error={context.saveWorkOrderMutation.data?.errors?.customerId ?? ''}
      />
    </ResponsiveGrid>
  );
};

const WorkOrderItems = ({ context }: { context: WorkOrderContext }) => {
  const [query, setQuery] = useState('');

  const productSelectorPopup = context.usePopup('ProductSelector', ({ lineItems, charges }) => {
    // TODO: Charge reduce types instead of set-field everywhere
    context.dispatchCreateWorkOrder({
      type: 'set-field',
      field: 'charges',
      value: [...(context.createWorkOrder.charges ?? []), ...charges],
    });

    for (const lineItem of lineItems) {
      context.dispatchCreateWorkOrder({ type: 'upsert-line-item', lineItem, isUnstackable: false });
    }
  });

  const serviceSelectorPopup = context.usePopup('ServiceSelector', ({ type, lineItem, charges }) => {
    const isUnstackable = type === 'mutable-service';

    const createWorkOrderCharges = [...(context.createWorkOrder.charges ?? []), ...charges];

    context.dispatchCreateWorkOrder({
      type: 'set-field',
      field: 'charges',
      value: createWorkOrderCharges,
    });

    context.dispatchCreateWorkOrder({ type: 'upsert-line-item', lineItem, isUnstackable });

    if (type === 'mutable-service') {
      mutableServiceConfigPopup.navigate({
        readonly: context.hasOrder,
        hasBasePrice: false,
        lineItem,
        labour: createWorkOrderCharges.filter(l => l.lineItemUuid === lineItem.uuid) ?? [],
      });
    }
  });

  const handleLineItemConfigResult = (
    result:
      | { type: 'product' | 'mutable-service'; hasLabour: true; result: ScreenInputOutput['LabourLineItemConfig'][1] }
      | { type: 'product' | 'fixed-service'; hasLabour: false; result: ScreenInputOutput['LineItemConfig'][1] },
  ) => {
    if (result.result.type === 'remove') {
      context.dispatchCreateWorkOrder({
        type: 'remove-line-item',
        lineItem: result.result.lineItem,
      });

      if (result.hasLabour) {
        context.dispatchCreateWorkOrder({
          type: 'set-field',
          field: 'charges',
          value: context.createWorkOrder.charges?.filter(l => l.lineItemUuid !== result.result.lineItem.uuid) ?? [],
        });
      }
      return;
    }

    if (result.result.type === 'update') {
      const lineItemUuid = result.result.lineItem.uuid;

      if (result.hasLabour) {
        context.dispatchCreateWorkOrder({
          type: 'set-field',
          field: 'charges',
          value: [
            ...(context.createWorkOrder.charges?.filter(l => l.lineItemUuid !== lineItemUuid) ?? []),
            ...result.result.labour.map(l => ({ ...l, lineItemUuid })),
          ],
        });
      }

      context.dispatchCreateWorkOrder({
        type: 'upsert-line-item',
        lineItem: result.result.lineItem,
        isUnstackable: result.type === 'mutable-service',
      });

      return;
    }

    if (result.result.type === 'assign-employees') {
      labourLineItemConfigPopup.navigate({
        readonly: context.hasOrder,
        hasBasePrice: result.type !== 'mutable-service',
        lineItem: result.result.lineItem,
        labour: [],
      });

      return;
    }

    return result.result.type satisfies never;
  };

  const mutableServiceConfigPopup = context.usePopup('LabourLineItemConfig', result =>
    handleLineItemConfigResult({ type: 'mutable-service', hasLabour: true, result }),
  );

  const fixedServiceConfigPopup = context.usePopup('LineItemConfig', result =>
    handleLineItemConfigResult({ type: 'fixed-service', hasLabour: false, result }),
  );

  const productConfigPopup = context.usePopup('LineItemConfig', result =>
    handleLineItemConfigResult({ type: 'product', hasLabour: false, result }),
  );

  const labourLineItemConfigPopup = context.usePopup('LabourLineItemConfig', result =>
    handleLineItemConfigResult({ type: 'product', hasLabour: true, result }),
  );

  const rows = useItemRows(context, query, (type, lineItem) => {
    switch (type) {
      case 'product': {
        const hasLabour = context.createWorkOrder.charges?.some(ea => ea.lineItemUuid === lineItem.uuid);

        if (hasLabour) {
          labourLineItemConfigPopup.navigate({
            labour: context.createWorkOrder.charges?.filter(ea => ea.lineItemUuid === lineItem.uuid) ?? [],
            hasBasePrice: true,
            readonly: context.hasOrder,
            lineItem,
          });
        } else {
          productConfigPopup.navigate({
            readonly: context.hasOrder,
            canAddLabour: true,
            lineItem,
          });
        }

        break;
      }

      case 'fixed-service':
        fixedServiceConfigPopup.navigate({
          readonly: context.hasOrder,
          canAddLabour: false,
          lineItem,
        });
        break;

      case 'mutable-service':
        mutableServiceConfigPopup.navigate({
          labour: context.createWorkOrder.charges?.filter(ea => ea.lineItemUuid === lineItem.uuid) ?? [],
          hasBasePrice: false,
          readonly: context.hasOrder,
          lineItem,
        });
        break;

      default: {
        return type satisfies never;
      }
    }
  });

  return (
    <ResponsiveGrid columns={1}>
      <ResponsiveGrid columns={2}>
        <Button
          title="Add Product"
          type="primary"
          onPress={() => productSelectorPopup.navigate()}
          isDisabled={context.hasOrder}
        />
        <Button
          title="Add Service"
          type="primary"
          onPress={() => serviceSelectorPopup.navigate()}
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
  const api = useExtensionApi<'pos.home.modal.render'>();

  const discountSelectorPopup = context.usePopup('DiscountSelector', result => {
    context.dispatchCreateWorkOrder({
      type: 'set-field',
      field: 'discount',
      value: result,
    });

    api.toast.show('Applying discount', { duration: 1000 });
  });

  // TODO: Re-add this?
  // const shippingConfigPopup = context.usePopup('ShippingConfig', result => {
  //   context.dispatchCreateWorkOrder({
  //     type: 'set-field',
  //     field: 'price',
  //     value: { ...price, shipping: result },
  //   });
  // });

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

  const totalPriceBigDecimal = calculateDraftOrderResponse?.totalPrice
    ? BigDecimal.fromMoney(calculateDraftOrderResponse?.totalPrice)
    : context.workOrderQuery?.data?.workOrder?.order?.total
      ? BigDecimal.fromMoney(context.workOrderQuery?.data?.workOrder?.order?.total)
      : BigDecimal.ZERO;

  const outstandingBigDecimal = totalPriceBigDecimal.subtract(receivedBigDecimal);

  const outstanding =
    outstandingBigDecimal.compare(BigDecimal.ZERO) < 0 ? '-' : currencyFormatter(outstandingBigDecimal.toMoney());

  const received = currencyFormatter(context.workOrderQuery.data?.workOrder?.order?.received ?? 0);
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
          <NumberField label="Subtotal" disabled value={getFormattedCalculatedMoney('subtotalPrice')} />
          <NumberField
            label={'Discount'}
            value={discountValue}
            disabled={!calculateDraftOrderResponse || context.hasOrder}
            onFocus={() => {
              const subTotal = calculateDraftOrderResponse
                ? calculateDraftOrderResponse.subtotalPrice
                : BigDecimal.ZERO.toMoney();
              discountSelectorPopup.navigate({ subTotal });
            }}
          />
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
          {context.hasOrder && Number(context.workOrderQuery.data?.workOrder?.order?.outstanding ?? 0) !== 0 && (
            <Banner
              title={`This order has been partially paid (${received} / ${outstanding}). The remaining balance can be paid through order ${context.workOrderQuery.data?.workOrder?.order?.name}`}
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

function useItemRows(
  context: WorkOrderContext,
  query: string,
  openPopup: (type: 'product' | 'mutable-service' | 'fixed-service', lineItem: CreateWorkOrderLineItem) => void,
): ListRow[] {
  const fetch = useAuthenticatedFetch();
  const currencyFormatter = useCurrencyFormatter();

  const productVariantQueries = useProductVariantQueries({
    fetch,
    ids: context.createWorkOrder.lineItems?.map(li => li.productVariantId) ?? [],
  });

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

            const popupType = productVariant.product.isMutableServiceItem
              ? 'mutable-service'
              : productVariant.product.isFixedServiceItem
                ? 'fixed-service'
                : 'product';

            openPopup(popupType, lineItem);
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
