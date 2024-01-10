import {
  Banner,
  Button,
  DateField,
  List,
  ListRow,
  NumberField,
  ScrollView,
  SearchBar,
  Stack,
  Text,
  TextArea,
  TextField,
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
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useCreateWorkOrderReducer } from '../create-work-order/reducer.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { Cents, Dollars, parseMoney, toDollars } from '@work-orders/common/util/money.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { unique } from '@work-orders/common/util/array.js';
import { PayButton } from '../components/PayButton.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { CreateWorkOrderLineItem } from './routes.js';
import { Money } from '@web/schemas/generated/shop-settings.js';
import { useUnsavedChangesDialog } from '../providers/UnsavedChangesDialogProvider.js';

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
    employeeAssignments: createWorkOrder.employeeAssignments ?? [],
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
  const unsavedChangesDialog = useUnsavedChangesDialog();
  const navigateBack = () => {
    context.dispatchCreateWorkOrder({ type: 'reset-work-order' });
    context.navigate('Entry');
  };

  return (
    <Screen
      title={context.title}
      isLoading={context.workOrderQuery.isFetching || context.saveWorkOrderMutation.isLoading || paymentLoading}
      overrideNavigateBack={() => {
        if (context.unsavedChanges) {
          unsavedChangesDialog.show({ onAction: navigateBack });
        } else {
          navigateBack();
        }
      }}
    >
      <ScrollView>
        {context.hasOrder && (
          <Banner
            title={`This order has been (partially) paid through order ${context.workOrderQuery.data?.workOrder?.order?.name}. You can no longer change the products and services within this order`}
            variant={'information'}
            visible
          />
        )}

        <WorkOrderProperties context={context} />

        <Stack direction="horizontal" flexChildren>
          <WorkOrderItems context={context} />

          <Stack direction="vertical" flex={1} alignment="flex-start">
            <WorkOrderDescription context={context} />
            <WorkOrderAssignment context={context} />
            <WorkOrderMoney context={context} />
          </Stack>
        </Stack>

        <Stack direction="horizontal" flexChildren paddingVertical={'ExtraLarge'}>
          <ShowDerivedFromOrderPreviewButton context={context} />
          {!context.hasOrder && (
            <PayButton createWorkOrder={context.createWorkOrder} workOrderName={null} setLoading={setPaymentLoading} />
          )}
          <SaveWorkOrderButton context={context} />
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

function SaveWorkOrderButton({ context }: { context: WorkOrderContext }) {
  const title = context.createWorkOrder.name ? 'Update Work Order' : 'Create Work Order';

  return (
    <Button
      title={title}
      type="primary"
      onPress={() => context.saveWorkOrderMutation.mutate(context.createWorkOrder)}
      isDisabled={context.saveWorkOrderMutation.isLoading}
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
    <Stack direction="horizontal" flexChildren>
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
    </Stack>
  );
};

const WorkOrderItems = ({ context }: { context: WorkOrderContext }) => {
  const [query, setQuery] = useState('');

  const productSelectorPopup = context.usePopup('ProductSelector', lineItem => {
    context.dispatchCreateWorkOrder({ type: 'add-line-item', lineItem, allowMerge: true });
  });

  const serviceSelectorPopup = context.usePopup('ServiceSelector', lineItem => {
    context.dispatchCreateWorkOrder({ type: 'add-line-item', lineItem, allowMerge: false });
    serviceConfigPopup.navigate({
      readonly: context.hasOrder,
      lineItem,
      employeeAssignments:
        context.createWorkOrder.employeeAssignments?.filter(ea => ea.lineItemUuid === lineItem.uuid) ?? [],
    });
  });

  const serviceConfigPopup = context.usePopup('ServiceLineItemConfig', result => {
    switch (result.type) {
      case 'remove': {
        context.dispatchCreateWorkOrder({
          type: 'remove-line-item',
          lineItem: result.lineItem,
        });
        break;
      }

      case 'update': {
        context.dispatchCreateWorkOrder({
          type: 'update-line-item',
          lineItem: result.lineItem,
        });

        const lineItemUuid = result.lineItem.uuid;

        context.dispatchCreateWorkOrder({
          type: 'set-assigned-employees',
          employees: [
            ...(context.createWorkOrder.employeeAssignments?.filter(
              assignment => assignment.lineItemUuid !== lineItemUuid,
            ) ?? []),
            ...result.employeeAssignments.map(assignment => ({ ...assignment, lineItemUuid })),
          ],
        });
        break;
      }

      default:
        return result.type satisfies never;
    }
  });

  const productConfigPopup = context.usePopup('ProductLineItemConfig', result => {
    switch (result.type) {
      case 'remove': {
        context.dispatchCreateWorkOrder({
          type: 'remove-line-item',
          lineItem: result.lineItem,
        });
        break;
      }

      case 'update': {
        context.dispatchCreateWorkOrder({
          type: 'update-line-item',
          lineItem: result.lineItem,
        });
        break;
      }

      default:
        return result.type satisfies never;
    }
  });

  const rows = useItemRows(context, query, (type, lineItem) => {
    switch (type) {
      case 'product':
        productConfigPopup.navigate({
          readonly: context.hasOrder,
          lineItem,
        });
        break;

      case 'service':
        serviceConfigPopup.navigate({
          readonly: context.hasOrder,
          lineItem,
          employeeAssignments:
            context.createWorkOrder.employeeAssignments?.filter(ea => ea.lineItemUuid === lineItem.uuid) ?? [],
        });
        break;

      default: {
        return type satisfies never;
      }
    }
  });

  return (
    <Stack direction="vertical" flex={1} paddingVertical={'ExtraSmall'}>
      <Stack direction={'horizontal'} flexChildren>
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
      </Stack>
      <SearchBar placeholder="Search items" initialValue={query} onTextChange={setQuery} onSearch={() => {}} />
      {rows.length ? (
        <List data={rows}></List>
      ) : (
        <Stack direction="horizontal" alignment="center" paddingVertical={'Large'}>
          <Text variant="body" color="TextSubdued">
            No products or services added to work order
          </Text>
        </Stack>
      )}
    </Stack>
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

  // TODO: Re-add this
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

  const outstanding = context.workOrderQuery?.data?.workOrder?.order?.outstanding
    ? currencyFormatter(context.workOrderQuery.data.workOrder.order?.outstanding)
    : getFormattedCalculatedMoney('totalPrice');

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
              const subTotal = calculateDraftOrderResponse ? parseMoney(calculateDraftOrderResponse.subtotalPrice) : 0;
              discountSelectorPopup.navigate({ subTotal });
            }}
          />
        </Stack>
        <Stack direction={'horizontal'} flexChildren flex={1}>
          <NumberField
            label="Shipping"
            value={getFormattedCalculatedMoney('totalShippingPrice')}
            disabled={context.hasOrder}
          />
          <NumberField label="Tax" disabled value={getFormattedCalculatedMoney('totalTax')} />
        </Stack>
      </Stack>

      <Stack direction="vertical" flexChildren flex={1}>
        <NumberField label="Total" disabled value={getFormattedCalculatedMoney('totalPrice')} />

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
  const employeeSelectorPopup = context.usePopup('EmployeeSelector', result => {
    context.dispatchCreateWorkOrder({
      type: 'set-assigned-employees',
      employees: context.createWorkOrder.employeeAssignments?.filter(ea => result.includes(ea.employeeId)) ?? [],
    });
  });

  const selectedEmployeeIds = unique(
    context.createWorkOrder.employeeAssignments?.map(employee => employee.employeeId) ?? [],
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

  // TODO: Make assigned employees show both work order and line item assignments. On click, show a popup with all the assigned employees, and clicking them shows where they are assigned, + whether they are assigned globally
  // TODO       Also has an "Add employee button"
  return (
    <Stack direction="vertical" flex={1} flexChildren>
      <TextArea
        rows={Math.max(1, selectedEmployeeIds.length) - 1}
        disabled
        label="Assigned Employees"
        onFocus={() => employeeSelectorPopup.navigate(selectedEmployeeIds)}
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
  openPopup: (type: 'product' | 'service', lineItem: CreateWorkOrderLineItem) => void,
): ListRow[] {
  const fetch = useAuthenticatedFetch();
  const currencyFormatter = useCurrencyFormatter();

  const settingsQuery = useSettingsQuery({ fetch });
  const productVariantQueries = useProductVariantQueries({
    fetch,
    ids: context.createWorkOrder.lineItems?.map(li => li.productVariantId) ?? [],
  });
  const employeeQueries = useEmployeeQueries({
    fetch,
    ids: context.createWorkOrder.employeeAssignments?.map(ea => ea.employeeId) ?? [],
  });

  return (
    context.createWorkOrder.lineItems
      ?.map(lineItem => ({ lineItem, productVariant: productVariantQueries[lineItem.productVariantId]?.data ?? null }))
      ?.filter(
        ({ productVariant }) =>
          !query || getProductVariantName(productVariant)?.toLowerCase().includes(query.toLowerCase()),
      )
      ?.map<ListRow>(({ lineItem, productVariant }) => {
        const productVariantPrice = productVariant ? parseMoney(productVariant.price) : (0 as Dollars);
        const employeeAssignmentsPrice = context.createWorkOrder.employeeAssignments
          ?.filter(assignment => assignment.lineItemUuid === lineItem.uuid)
          .reduce(
            (total, { employeeId, hours }) =>
              total + hours * toDollars(employeeQueries[employeeId]?.data?.rate ?? (0 as Cents)),
            0,
          ) as Dollars;

        return {
          id: lineItem.uuid,
          onPress() {
            if (!productVariant || !settingsQuery.data || !lineItem) return;

            const popupType = productVariant.product.isServiceItem ? 'service' : 'product';

            openPopup(popupType, lineItem);
          },
          leftSide: {
            label: getProductVariantName(productVariant) ?? 'Unknown item',
            subtitle: productVariant?.sku ? [productVariant.sku] : undefined,
            image: {
              source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url ?? 'not found',
              badge: lineItem.quantity > 1 ? lineItem.quantity : undefined,
            },
          },
          rightSide: {
            label: currencyFormatter((productVariantPrice + employeeAssignmentsPrice) * lineItem.quantity),
            showChevron: true,
          },
        };
      }) ?? []
  );
}
