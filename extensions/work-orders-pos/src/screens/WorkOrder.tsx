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
import { Dispatch, useEffect, useReducer, useState } from 'react';
import { PopupNavigateFn, UsePopupFn, useScreen } from '../hooks/use-screen.js';
import { useSaveWorkOrderMutation, WorkOrderValidationErrors } from '../queries/use-save-work-order-mutation.js';
import { CurrencyFormatter, useCurrencyFormatter } from '../hooks/use-currency-formatter.js';
import { useWorkOrderQuery } from '../queries/use-work-order-query.js';
import { usePaymentHandler } from '../hooks/use-payment-handler.js';
import { getPriceDetails } from '../util/work-order.js';
import { WorkOrder, WorkOrderEmployeeAssignment, WorkOrderProduct, WorkOrderService } from '../types/work-order';

export function WorkOrderPage() {
  const [title, setTitle] = useState('');
  const [workOrderName, setWorkOrderName] = useState<string | null>(null);
  const [workOrder, dispatchWorkOrder] = useReducer(workOrderReducer, {});
  const [savedPriceDetails, setSavedPriceDetails] = useState(getPriceDetails(workOrder));
  const api = useExtensionApi<'pos.home.modal.render'>();

  const workOrderQuery = useWorkOrderQuery(workOrderName, {
    onSuccess(workOrder) {
      if (!workOrder) return;
      dispatchWorkOrder({ type: 'set-work-order', workOrder });
      setSavedPriceDetails(getPriceDetails(workOrder));
    },
    onError() {
      api.toast.show('Error loading work order');
      navigate('Entry');
    },
  });

  const { Screen, usePopup, navigate } = useScreen('WorkOrder', async action => {
    removeVisualHints();

    if (action.type === 'new-work-order') {
      setTitle('New Work Order');
      if (action.initial) {
        dispatchWorkOrder({ type: 'set-work-order', workOrder: { ...defaultWorkOrder, ...action.initial } });
      } else {
        dispatchWorkOrder({ type: 'reset-work-order' });
      }
    } else if (action.type === 'load-work-order') {
      setTitle(`Edit Work Order ${action.name}`);
      if (workOrderName === action.name) {
        workOrderQuery.refetch();
      } else {
        setWorkOrderName(action.name);
      }
    }
  });

  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [validationErrors, setValidationErrors] = useState<null | WorkOrderValidationErrors>(null);

  const workOrderSavedPopup = usePopup('WorkOrderSaved');

  const saveWorkOrderMutation = useSaveWorkOrderMutation({
    onMutate() {
      setErrorMessage(null);
      setValidationErrors(null);
    },
    onSuccess(result) {
      setWorkOrderName(result.workOrder.name);
      workOrderSavedPopup.navigate({ ...workOrder, name: result.workOrder.name } as WorkOrder);
    },
    onError(error) {
      if (typeof error === 'string') {
        setErrorMessage(error);
        setValidationErrors(null);
      } else if (error instanceof Error) {
        setErrorMessage(`Unexpected error (${error.message})`);
        setValidationErrors(null);
      } else {
        setErrorMessage(null);
        setValidationErrors(error);
      }
    },
  });

  const paymentHandler = usePaymentHandler();

  function removeVisualHints() {
    setErrorMessage(null);
    setValidationErrors(null);
  }

  return (
    <Screen
      title={title}
      isLoading={workOrderQuery.isFetching || saveWorkOrderMutation.isLoading || paymentHandler.isLoading}
      overrideNavigateBack={() => navigate('Entry')}
    >
      <ScrollView>
        {errorMessage && <Banner title={errorMessage} variant="error" visible />}

        <WorkOrderProperties
          workOrder={workOrder}
          dispatchWorkOrder={dispatchWorkOrder}
          usePopup={usePopup}
          validationErrors={validationErrors}
        />

        <Stack direction="horizontal" flexChildren>
          <WorkOrderItems usePopup={usePopup} workOrder={workOrder} dispatchWorkOrder={dispatchWorkOrder} />

          <Stack direction="vertical" flex={1} alignment="flex-start">
            <TextArea
              rows={3}
              label="Description"
              value={workOrder.description}
              onChange={value => dispatchWorkOrder({ type: 'set-field', field: 'description', value: value })}
              error={validationErrors?.description ?? ''}
            />
            <WorkOrderAssignment
              workOrder={workOrder}
              dispatchWorkOrder={dispatchWorkOrder}
              usePopup={usePopup}
              validationErrors={validationErrors}
            />
            <WorkOrderMoney workOrder={workOrder} dispatchWorkOrder={dispatchWorkOrder} usePopup={usePopup} />

            {(errorMessage || validationErrors) && (
              <Banner title="An error occurred. Make sure that all fields are valid" variant="error" visible />
            )}
          </Stack>
        </Stack>

        <Stack direction="horizontal" flexChildren paddingVertical={'ExtraLarge'}>
          {workOrder.derivedFromOrder?.workOrderName && (
            <Button
              title={`Previous (${workOrder.derivedFromOrder.workOrderName})`}
              onPress={() => {
                if (!workOrder.derivedFromOrder?.workOrderName) return;
                navigate('WorkOrder', { type: 'load-work-order', name: workOrder.derivedFromOrder.workOrderName });
              }}
            />
          )}
          <Button
            title="Pay Balance"
            onPress={() => {
              if (!workOrder.name) {
                api.toast.show('You must save the work order before paying', { duration: 1000 });
                return;
              }

              if (savedPriceDetails.balanceDue <= 0) {
                api.toast.show('There is no due balance', { duration: 1000 });
                return;
              }

              return paymentHandler.handlePayment({
                customerId: workOrder!.customer!.id,
                workOrderName: workOrder.name!,
                type: 'balance',
                amount: savedPriceDetails.total,
                previouslyDeposited: savedPriceDetails.deposited,
              });
            }}
          />
          <Button
            title={workOrder.name ? 'Update Order' : 'Create Order'}
            type="primary"
            onPress={() => saveWorkOrderMutation.mutate(workOrder)}
            isDisabled={saveWorkOrderMutation.isLoading}
          />
        </Stack>
      </ScrollView>
    </Screen>
  );
}

type WorkOrderAction =
  | { type: 'reset-work-order' }
  | {
      type: 'set-work-order';
      workOrder: Partial<WorkOrder>;
    }
  | {
      type: 'add-product' | 'remove-product' | 'update-product';
      item: WorkOrderProduct;
    }
  | {
      type: 'add-service' | 'remove-service' | 'update-service';
      item: WorkOrderService;
    }
  | NonNullable<
      {
        [key in keyof WorkOrder]: {
          type: 'set-field';
          field: key;
          value: WorkOrder[key];
        };
      }[keyof WorkOrder]
    >
  | {
      type: 'set-assigned-employees';
      employees: NonNullable<WorkOrderEmployeeAssignment[]>;
    };

const workOrderReducer = (workOrder: Partial<WorkOrder>, action: WorkOrderAction): Partial<WorkOrder> => {
  if (action.type === 'add-product') {
    const productVariantId = action.item.productVariantId;
    const existingItem = workOrder.products?.find(item => item.productVariantId === productVariantId);
    if (existingItem) {
      action = {
        type: 'update-product',
        item: { ...existingItem, quantity: existingItem.quantity + action.item.quantity },
      };
    }
  }

  switch (action.type) {
    case 'reset-work-order':
      return defaultWorkOrder;

    case 'set-work-order':
      return action.workOrder;

    case 'add-product':
      return {
        ...workOrder,
        products: [...(workOrder.products ?? []), action.item],
      };

    case 'remove-product': {
      const productVariantId = action.item.productVariantId;
      return {
        ...workOrder,
        products: (workOrder.products ?? []).filter(item => item.productVariantId !== productVariantId),
      };
    }

    case 'update-product': {
      const updateItem = action.item;
      return {
        ...workOrder,
        products: (workOrder.products ?? []).map(item =>
          item.productVariantId === updateItem.productVariantId ? updateItem : item,
        ),
      };
    }

    case 'add-service':
      return {
        ...workOrder,
        services: [...(workOrder.services ?? []), action.item],
      };

    case 'remove-service': {
      const removeItem = action.item;
      return {
        ...workOrder,
        services: (workOrder.services ?? []).filter(item => item.uuid !== removeItem.uuid),
      };
    }

    case 'update-service': {
      const updateItem = action.item;

      return {
        ...workOrder,
        services: (workOrder.services ?? []).map(item => (item.uuid === updateItem.uuid ? updateItem : item)),
        employeeAssignments: [
          ...(workOrder.employeeAssignments ?? []).filter(
            e => !updateItem.employeeAssignments.some(a => a.employeeId === e.employeeId),
          ),
          ...updateItem.employeeAssignments,
        ],
      };
    }

    case 'set-assigned-employees':
      return {
        ...workOrder,
        employeeAssignments: action.employees,
      };

    case 'set-field':
      return {
        ...workOrder,
        [action.field]: action.value,
      };

    default:
      return action satisfies never;
  }
};

const defaultWorkOrder: Partial<WorkOrder> = {
  dueDate: new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(),
  customer: undefined,
  employeeAssignments: [],
  name: undefined,
  products: [],
  services: [],
  price: {
    tax: 0,
    discount: 0,
    shipping: 0,
  },
  description: '',
  status: undefined,
  derivedFromOrder: undefined,
  payments: [],
};

const WorkOrderProperties = ({
  workOrder,
  dispatchWorkOrder,
  usePopup,
  validationErrors,
}: {
  workOrder: Partial<WorkOrder>;
  dispatchWorkOrder: Dispatch<WorkOrderAction>;
  usePopup: UsePopupFn;
  validationErrors: WorkOrderValidationErrors | null;
}) => {
  const statusSelectorPopup = usePopup('StatusSelector', result => {
    dispatchWorkOrder({ type: 'set-field', field: 'status', value: result });
  });

  const customerSelectorPopup = usePopup('CustomerSelector', result => {
    dispatchWorkOrder({ type: 'set-field', field: 'customer', value: result });
  });

  return (
    <Stack direction="horizontal" flexChildren>
      <TextField label="Work Order ID" disabled value={workOrder.name ?? ''} />
      {workOrder.derivedFromOrder && (
        <>
          {workOrder.derivedFromOrder.workOrderName && (
            <TextField label="Previous Work Order" disabled value={workOrder.derivedFromOrder.workOrderName} />
          )}
          {!workOrder.derivedFromOrder.workOrderName && (
            <TextField label="Previous Order" disabled value={workOrder.derivedFromOrder.name} />
          )}
        </>
      )}
      <TextField
        label="Status"
        required
        placeholder="Status"
        onFocus={() => statusSelectorPopup.navigate()}
        value={workOrder.status ?? ''}
        error={validationErrors?.status ?? ''}
      />
      <TextField
        label="Customer"
        required
        placeholder="Customer"
        onFocus={() => customerSelectorPopup.navigate()}
        value={workOrder.customer?.name ?? ''}
        error={validationErrors?.customer ?? ''}
      />
    </Stack>
  );
};

const WorkOrderItems = ({
  workOrder,
  usePopup,
  dispatchWorkOrder,
}: {
  workOrder: Partial<WorkOrder>;
  dispatchWorkOrder: Dispatch<WorkOrderAction>;
  usePopup: UsePopupFn;
}) => {
  const productSelectorPopup = usePopup('ProductSelector', result => {
    dispatchWorkOrder({ type: 'add-product', item: result });
  });

  const serviceSelectorPopup = usePopup('ServiceSelector', result => {
    dispatchWorkOrder({ type: 'add-service', item: result });
    serviceConfigPopup.navigate(result);
  });

  const productConfigPopup = usePopup('ProductConfig', result => {
    if (result.type === 'remove') {
      dispatchWorkOrder({ type: 'remove-product', item: result.product });
    } else if (result.type === 'update') {
      dispatchWorkOrder({ type: 'update-product', item: result.product });
    } else {
      return result.type satisfies never;
    }
  });

  const serviceConfigPopup = usePopup('ServiceConfig', result => {
    if (result.type === 'remove') {
      dispatchWorkOrder({ type: 'remove-service', item: result.service });
    } else if (result.type === 'update') {
      dispatchWorkOrder({ type: 'update-service', item: result.service });
    } else {
      return result.type satisfies never;
    }
  });

  const [query, setQuery] = useState('');
  const currencyFormatter = useCurrencyFormatter();

  const rows = getItemRows(
    workOrder,
    query,
    currencyFormatter,
    productConfigPopup.navigate,
    serviceConfigPopup.navigate,
  );

  return (
    <Stack direction="vertical" flex={1} paddingVertical={'ExtraSmall'}>
      <Stack direction={'horizontal'} flexChildren>
        <Button title="Add Product" type="primary" onPress={() => productSelectorPopup.navigate()} />
        <Button title="Add Service" type="primary" onPress={() => serviceSelectorPopup.navigate()} />
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

function getItemRows(
  workOrder: Partial<WorkOrder>,
  query: string,
  currencyFormatter: CurrencyFormatter,
  openProductConfig: PopupNavigateFn<'ProductConfig'>,
  openServiceConfig: PopupNavigateFn<'ServiceConfig'>,
): ListRow[] {
  const rows: ListRow[] = [];

  const queryFilter = (item: WorkOrderProduct | WorkOrderService) =>
    !query ||
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.sku.toLowerCase().includes(query.toLowerCase());

  if (workOrder.services) {
    rows.push(
      ...workOrder.services.filter(queryFilter).map<ListRow>(item => {
        const assignedEmployeePrice = item.employeeAssignments.reduce(
          (total, employee) => total + employee.hours * employee.employeeRate,
          0,
        );

        return {
          id: item.productVariantId,
          onPress: () => {
            openServiceConfig(item);
          },
          leftSide: {
            label: item.name,
            subtitle: item.sku ? [item.sku] : undefined,
            image: {
              source: item.imageUrl ?? 'not found',
            },
          },
          rightSide: {
            label: currencyFormatter(item.basePrice + assignedEmployeePrice),
            showChevron: true,
          },
        };
      }),
    );
  }

  if (workOrder.products) {
    rows.push(
      ...workOrder.products.filter(queryFilter).map<ListRow>(item => ({
        id: item.productVariantId,
        onPress: () => {
          openProductConfig(item);
        },
        leftSide: {
          label: item.name,
          subtitle: item.sku ? [item.sku] : undefined,
          image: {
            source: item.imageUrl ?? 'not found',
            badge: item.quantity > 1 ? item.quantity : undefined,
          },
        },
        rightSide: {
          label: currencyFormatter(item.unitPrice * item.quantity),
          showChevron: true,
        },
      })),
    );
  }

  return rows;
}

const WorkOrderMoney = ({
  workOrder,
  dispatchWorkOrder,
  usePopup,
}: {
  workOrder: Partial<WorkOrder>;
  dispatchWorkOrder: Dispatch<WorkOrderAction>;
  usePopup: UsePopupFn;
}) => {
  const price = workOrder.price ?? { tax: 0, discount: 0, shipping: 0 };

  const [discountPercentage, setDiscountPercentage] = useState<null | number>(null);
  const discountLabel = 'Discount' + (discountPercentage !== null ? ` (${discountPercentage}%)` : '');

  // TODO: make this work/configurable
  const taxPercentage = 13;
  const taxLabel = `Tax (${taxPercentage}%)`;

  const discountSelectorPopup = usePopup('DiscountOrDepositSelector', async result => {
    if (result.select === 'discount') {
      if (result.type === 'percentage') {
        setDiscountPercentage(result.percentage);
      } else {
        setDiscountPercentage(null);
      }

      dispatchWorkOrder({
        type: 'set-field',
        field: 'price',
        value: { ...price, discount: result.currencyAmount },
      });
    }
  });

  const shippingConfigPopup = usePopup('ShippingConfig', result => {
    dispatchWorkOrder({
      type: 'set-field',
      field: 'price',
      value: { ...price, shipping: result },
    });
  });

  const { balanceDue, total, paid, subTotal, deposited } = getPriceDetails(workOrder);

  useEffect(() => {
    dispatchWorkOrder({
      type: 'set-field',
      field: 'price',
      value: { ...price, tax: Math.ceil(100 * subTotal * (taxPercentage / 100)) / 100 },
    });
  }, [subTotal]);

  const currencyFormatter = useCurrencyFormatter();

  return (
    <Stack direction="vertical" flex={1}>
      <Stack direction="vertical" flex={1}>
        <Stack direction={'horizontal'} flexChildren flex={1}>
          <NumberField label="Subtotal" disabled value={currencyFormatter(subTotal)} />
          <NumberField
            label={discountLabel}
            value={currencyFormatter(price.discount)}
            onFocus={() => discountSelectorPopup.navigate({ select: 'discount', subTotal })}
          />
        </Stack>
        <Stack direction={'horizontal'} flexChildren flex={1}>
          <NumberField label={taxLabel} disabled value={currencyFormatter(price.tax)} />
          <NumberField
            label="Shipping"
            value={currencyFormatter(price.shipping)}
            onFocus={() => shippingConfigPopup.navigate()}
          />
        </Stack>
      </Stack>

      <Stack direction="vertical" flexChildren flex={1}>
        <NumberField label="Total" disabled value={currencyFormatter(total)} />

        <Stack direction={'vertical'}>
          <Stack direction={'horizontal'} flexChildren flex={1}>
            <NumberField label={'Paid'} disabled={true} value={currencyFormatter(paid - deposited)} />
            <NumberField label="Balance Due" disabled value={currencyFormatter(balanceDue)} />
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
};

const WorkOrderAssignment = ({
  workOrder,
  dispatchWorkOrder,
  usePopup,
  validationErrors,
}: {
  workOrder: Partial<WorkOrder>;
  dispatchWorkOrder: Dispatch<WorkOrderAction>;
  usePopup: UsePopupFn;
  validationErrors: WorkOrderValidationErrors | null;
}) => {
  const employeeSelectorPopup = usePopup('EmployeeSelector', result => {
    dispatchWorkOrder({ type: 'set-assigned-employees', employees: result });
  });

  const selectedEmployeeNames = workOrder.employeeAssignments?.map(employee => employee.name).join('\n');
  const selectedEmployeeIds = workOrder.employeeAssignments?.map(employee => employee.employeeId) ?? [];

  const setDueDate = (date: string) => {
    const dueDate = new Date(date);
    const dueDateUtc = new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60 * 1000);
    dispatchWorkOrder({ type: 'set-field', field: 'dueDate', value: dueDateUtc.toISOString() });
  };

  return (
    <Stack direction="vertical" flex={1} flexChildren>
      <TextArea
        rows={Math.max(1, selectedEmployeeIds.length) - 1}
        label="Assigned Employees"
        onFocus={() => employeeSelectorPopup.navigate({ selectedEmployeeIds })}
        value={selectedEmployeeNames}
      />
      <DateField
        label="Due date"
        value={workOrder?.dueDate}
        onChange={setDueDate}
        error={validationErrors?.dueDate ?? ''}
      />
    </Stack>
  );
};
