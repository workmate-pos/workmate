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
} from '@shopify/retail-ui-extensions-react';
import { Dispatch, useEffect, useReducer, useState } from 'react';
import { NavigateFn, UsePopupFn, useScreen } from '../hooks/use-screen';
import { useSettings } from '../hooks/use-settings';
import type { CreateWorkOrder } from '../schemas/generated/create-work-order';
import { useWorkOrderFetcher } from '../queries/use-work-order-fetcher';
import { useSaveWorkOrderMutation, WorkOrderValidationErrors } from '../queries/use-save-work-order-mutation';

export type WorkOrder = Omit<CreateWorkOrder, 'products' | 'employeeAssignments' | 'dueDate' | 'customer'> & {
  products: ({ name: string; sku: string } & CreateWorkOrder['products'][number])[];
  employeeAssignments: ({ name: string } & NonNullable<CreateWorkOrder['employeeAssignments']>[number])[];
  dueDate: Date;
  customer: { name: string } & CreateWorkOrder['customer'];
};

export type WorkOrderItem = WorkOrder['products'][number];
export type WorkOrderEmployee = WorkOrder['employeeAssignments'][number];
export type WorkOrderCustomer = WorkOrder['customer'];
export type WorkOrderStatus = WorkOrder['status'];

export function WorkOrder() {
  const fetchWorkOrder = useWorkOrderFetcher();
  const [loadingWorkOrder, setLoadingWorkOrder] = useState(true);
  const [title, setTitle] = useState('');

  const { Screen, usePopup, navigate, dismiss } = useScreen('WorkOrder', async action => {
    setLoadingWorkOrder(true);
    removeVisualHints();

    try {
      if (action.type === 'new-work-order') {
        setTitle('New Work Order');
        dispatchWorkOrder({ type: 'reset-work-order' });
      } else if (action.type === 'load-work-order') {
        setTitle(`Edit Work Order ${action.name}`);
        const workOrder = await fetchWorkOrder(action.name);
        if (workOrder) {
          dispatchWorkOrder({ type: 'set-work-order', workOrder });
        }
      }
    } finally {
      setLoadingWorkOrder(false);
    }
  });

  const settings = useSettings();
  const [workOrder, dispatchWorkOrder] = useReducer(workOrderReducer, {});
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [validationErrors, setValidationErrors] = useState<null | WorkOrderValidationErrors>(null);
  const [showWorkOrderSavedBanner, setShowWorkOrderSavedBanner] = useState(false);

  const saveWorkOrderMutation = useSaveWorkOrderMutation();

  useEffect(() => {
    const { error } = saveWorkOrderMutation;
    if (!error) {
      setErrorMessage(null);
      setValidationErrors(null);
      return;
    }

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
  }, [saveWorkOrderMutation.error]);

  useEffect(() => {
    const { data } = saveWorkOrderMutation;
    if (!data) return;

    if (data.success) {
      setShowWorkOrderSavedBanner(true);
    }
  }, [saveWorkOrderMutation.data]);

  useEffect(removeVisualHints, [workOrder]);

  function removeVisualHints() {
    setErrorMessage(null);
    setValidationErrors(null);
    setShowWorkOrderSavedBanner(false);
  }

  return (
    <Screen title={title} isLoading={!settings || loadingWorkOrder}>
      <ScrollView>
        {errorMessage && <Banner title={errorMessage} variant="error" visible />}
        <WorkOrderProperties
          workOrder={workOrder}
          dispatchWorkOrder={dispatchWorkOrder}
          usePopup={usePopup}
          navigate={navigate}
          validationErrors={validationErrors}
        />

        <Stack direction="horizontal" flexChildren>
          <WorkOrderItems usePopup={usePopup} workOrder={workOrder} dispatchWorkOrder={dispatchWorkOrder} />

          <Stack direction="vertical" flex={1} alignment="flex-start">
            <WorkOrderActions />
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

            {showWorkOrderSavedBanner && (
              <Banner
                title="Work order saved successfully"
                variant="confirmation"
                visible
                action="Back to work orders"
                onPress={() => navigate('Entry', { forceReload: true })}
              />
            )}

            <Stack direction="horizontal" flexChildren>
              <Button
                title="Cancel"
                type="destructive"
                onPress={() => dismiss()}
                isDisabled={saveWorkOrderMutation.isLoading}
              />
              <Button title="Print" isDisabled={saveWorkOrderMutation.isLoading} />
              <Button
                title="Save & Print"
                type="primary"
                onPress={() => saveWorkOrderMutation.mutate(workOrder)}
                isDisabled={saveWorkOrderMutation.isLoading}
              />
            </Stack>
          </Stack>
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
      type: 'add-item' | 'remove-item' | 'update-item';
      item: WorkOrder['products'][number];
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
      employees: NonNullable<WorkOrder['employeeAssignments']>;
    };

const workOrderReducer = (workOrder: Partial<WorkOrder>, action: WorkOrderAction): Partial<WorkOrder> => {
  if (action.type === 'add-item') {
    const productId = action.item.productId;
    const existingItem = workOrder.products?.find(item => item.productId === productId);
    if (existingItem) {
      action = {
        type: 'update-item',
        item: { ...existingItem, quantity: existingItem.quantity + action.item.quantity },
      };
    }
  }

  switch (action.type) {
    case 'reset-work-order':
      return defaultWorkOrder;

    case 'set-work-order':
      return action.workOrder;

    case 'add-item':
      return {
        ...workOrder,
        products: [...(workOrder.products ?? []), action.item],
      };

    case 'remove-item': {
      const productId = action.item.productId;
      return {
        ...workOrder,
        products: (workOrder.products ?? []).filter(item => item.productId !== productId),
      };
    }

    case 'update-item': {
      const updateItem = action.item;
      return {
        ...workOrder,
        products: (workOrder.products ?? []).map(item => (item.productId === updateItem.productId ? updateItem : item)),
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
  dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  customer: undefined,
  employeeAssignments: [],
  name: undefined,
  products: [],
  price: {
    deposit: 0,
    tax: 0,
    discount: 0,
    shipping: 0,
  },
  description: '',
  status: undefined,
};

const WorkOrderProperties = ({
  workOrder,
  dispatchWorkOrder,
  usePopup,
  navigate,
  validationErrors,
}: {
  workOrder: Partial<WorkOrder>;
  dispatchWorkOrder: Dispatch<WorkOrderAction>;
  usePopup: UsePopupFn;
  navigate: NavigateFn;
  validationErrors: WorkOrderValidationErrors | null;
}) => {
  const statusSelectorPopup = usePopup('StatusSelector', result => {
    dispatchWorkOrder({ type: 'set-field', field: 'status', value: result });
  });

  const customerSelectorPopup = usePopup('CustomerSelector', result => {
    dispatchWorkOrder({ type: 'set-field', field: 'customer', value: result });
  });

  // <TextField
  //   label="Address"
  //   required
  //   placeholder="Address"
  //   onChange={value => dispatchWorkOrder({ type: 'set-field', field: 'address', value })}
  //   value={workOrder.address}
  // />

  return (
    <Stack direction="horizontal" flexChildren>
      <TextField
        label="Work Order ID"
        disabled
        onFocus={() => navigate('WorkOrderSelector', {})}
        value={workOrder.name ?? ''}
      />
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
  const itemSelectorPopup = usePopup('ItemSelector', result => {
    dispatchWorkOrder({ type: 'add-item', item: result });
  });

  const itemConfigPopup = usePopup('ItemConfig', result => {
    if (result.type === 'remove') {
      dispatchWorkOrder({ type: 'remove-item', item: result.item });
    } else if (result.type === 'update') {
      dispatchWorkOrder({ type: 'update-item', item: result.item });
    }
  });

  const [query, setQuery] = useState('');

  const rows: ListRow[] =
    workOrder.products
      ?.filter(
        item =>
          !query ||
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.sku.toLowerCase().includes(query.toLowerCase()),
      )
      .map<ListRow>(item => ({
        id: item.productId,
        onPress: () => {
          itemConfigPopup.navigate(item);
        },
        leftSide: {
          label: item.name,
          subtitle: [item.sku, `QTY: ${item.quantity}`],
        },
        rightSide: {
          label: `CA$ ${(item.unitPrice * item.quantity).toFixed(2)}`,
          showChevron: true,
        },
      })) ?? [];

  return (
    <Stack direction="vertical" flex={1}>
      <Button title="Add Product" type="primary" onPress={() => itemSelectorPopup.navigate()} />
      <SearchBar placeholder="Search products" initialValue={query} onTextChange={setQuery} onSearch={() => {}} />
      {rows.length ? (
        <List data={rows}></List>
      ) : (
        <Stack direction="horizontal" alignment="center" paddingVertical={'Large'}>
          <Text variant="body" color="TextSubdued">
            No products added to work order
          </Text>
        </Stack>
      )}
    </Stack>
  );
};

const WorkOrderMoney = ({
  workOrder,
  dispatchWorkOrder,
  usePopup,
}: {
  workOrder: Partial<WorkOrder>;
  dispatchWorkOrder: Dispatch<WorkOrderAction>;
  usePopup: UsePopupFn;
}) => {
  const price = { tax: 0, deposit: 0, discount: 0, shipping: 0, ...workOrder.price };

  // TODO: dedup
  const [depositPercentage, setDepositPercentage] = useState<null | number>(null);
  const depositLabel = 'Deposit' + (depositPercentage !== null ? ` (${depositPercentage}%)` : '');

  const [discountPercentage, setDiscountPercentage] = useState<null | number>(null);
  const discountLabel = 'Discount' + (discountPercentage !== null ? ` (${discountPercentage}%)` : '');

  // TODO: make this work/configurable
  const taxPercentage = 13;
  const taxLabel = `Tax (${taxPercentage}%)`;

  const discountOrDepositSelectorPopup = usePopup('DiscountOrDepositSelector', result => {
    const setPercentage = result.select === 'discount' ? setDiscountPercentage : setDepositPercentage;
    if (result.type === 'percentage') {
      setPercentage(result.percentage);
    } else {
      setPercentage(null);
    }

    dispatchWorkOrder({
      type: 'set-field',
      field: 'price',
      value: {
        ...price,
        ...(result.select === 'discount' ? { discount: result.currencyAmount } : { deposit: result.currencyAmount }),
      },
    });
  });

  const shippingConfigPopup = usePopup('ShippingConfig', result => {
    dispatchWorkOrder({
      type: 'set-field',
      field: 'price',
      value: { ...price, shipping: result },
    });
  });

  const subTotal = workOrder.products?.map(item => item.unitPrice * item.quantity).reduce((a, b) => a + b, 0) ?? 0;
  const total = subTotal + price.shipping + price.tax - price.discount;
  const due = total - price.deposit;

  useEffect(() => {
    dispatchWorkOrder({
      type: 'set-field',
      field: 'price',
      value: { ...price, tax: Math.ceil(100 * subTotal * (taxPercentage / 100)) / 100 },
    });
  }, [subTotal]);

  return (
    <Stack direction="vertical">
      <Stack direction="horizontal" flexChildren flex={1}>
        <Stack direction="vertical" flex={1}>
          <NumberField label="Subtotal" disabled value={'CA$ ' + subTotal.toFixed(2)} />
          <NumberField
            label={depositLabel}
            value={'CA$ ' + price.deposit.toFixed(2)}
            onFocus={() => discountOrDepositSelectorPopup.navigate({ select: 'deposit', subTotal })}
          />
          <NumberField
            label={discountLabel}
            value={'CA$ ' + price.discount.toFixed(2)}
            onFocus={() => discountOrDepositSelectorPopup.navigate({ select: 'discount', subTotal })}
          />
          <NumberField
            label="Shipping"
            value={'CA$ ' + price.shipping}
            onFocus={() => shippingConfigPopup.navigate()}
          />
          <NumberField label={taxLabel} disabled value={'CA$ ' + price.tax.toFixed(2)} />
        </Stack>
      </Stack>

      <Stack direction="horizontal" flexChildren>
        <NumberField label="Total" disabled value={'CA$ ' + total.toFixed(2)} />
        <NumberField label="Balance Due" disabled value={'CA$ ' + due.toFixed(2)} />
      </Stack>
    </Stack>
  );
};

const WorkOrderActions = () => (
  <Stack direction="horizontal" flexChildren>
    <Button title="Deposit" />
    <Button title="Overview" />
    <Button title="Settings" />
  </Stack>
);

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

  const employeeNames = workOrder.employeeAssignments?.map(employee => employee.name).join(', ') || 'None';

  const setDueDate = (date: string) => {
    dispatchWorkOrder({ type: 'set-field', field: 'dueDate', value: new Date(date) });
  };

  return (
    <Stack direction="horizontal" flexChildren>
      <TextField label="Assigned Employees" onFocus={() => employeeSelectorPopup.navigate()} value={employeeNames} />
      <DateField
        label="Due date"
        value={workOrder.dueDate?.toISOString()}
        onChange={setDueDate}
        error={validationErrors?.dueDate ?? ''}
      />
    </Stack>
  );
};
