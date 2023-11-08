import {
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
import { useMutation } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';

export type WorkOrder = Omit<CreateWorkOrder, 'items' | 'employeeAssignments' | 'dueDate' | 'customer'> & {
  id?: string;
  items: ({ name: string; sku: string } & CreateWorkOrder['items'][number])[];
  employeeAssignments: ({ name: string } & NonNullable<CreateWorkOrder['employeeAssignments']>[number])[];
  dueDate: Date;
  customer: { name: string } & CreateWorkOrder['customer'];
};

export type WorkOrderItem = WorkOrder['items'][number];
export type WorkOrderEmployee = WorkOrder['employeeAssignments'][number];
export type WorkOrderCustomer = WorkOrder['customer'];
export type WorkOrderStatus = WorkOrder['status'];

export function WorkOrder() {
  const settings = useSettings();
  const [workOrder, dispatchWorkOrder] = useReducer(workOrderReducer, {
    // DateField does not support empty values, so we need to set a default
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    customer: undefined,
    employeeAssignments: [],
    id: undefined,
    items: [],
    price: {
      deposit: 0,
      tax: 0,
      discount: 0,
      shipping: 0,
    },
    status: undefined,
  });
  const { Screen, usePopup, navigate, dismiss } = useScreen('WorkOrder');

  const fetch = useAuthenticatedFetch();
  // TODO: Validation
  const saveWorkOrderQuery = useMutation(
    async () =>
      fetch('/api/work-order', {
        body: JSON.stringify({
          status: workOrder.status!,
          customer: {
            id: workOrder.customer!.id,
          },
          price: {
            deposit: workOrder.price!.deposit,
            tax: workOrder.price!.tax,
            discount: workOrder.price!.discount,
            shipping: workOrder.price!.shipping,
          },
          dueDate: workOrder.dueDate!.toDateString(),
          items: workOrder.items!.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          employeeAssignments: workOrder.employeeAssignments!.map(employee => ({
            employeeId: employee.employeeId,
          })),
        } satisfies CreateWorkOrder),
      }),
    {
      onSuccess() {
        dismiss();
      },
    },
  );

  return (
    <Screen title="Work Order" isLoading={!settings}>
      <ScrollView>
        <WorkOrderProperties
          workOrder={workOrder}
          dispatchWorkOrder={dispatchWorkOrder}
          usePopup={usePopup}
          navigate={navigate}
        />

        <Stack direction="horizontal" flexChildren>
          <WorkOrderItems usePopup={usePopup} workOrder={workOrder} dispatchWorkOrder={dispatchWorkOrder} />

          <Stack direction="vertical" flex={1} alignment="flex-start">
            <WorkOrderActions />
            <WorkOrderDescription />
            <WorkOrderAssignment workOrder={workOrder} dispatchWorkOrder={dispatchWorkOrder} usePopup={usePopup} />
            <WorkOrderMoney workOrder={workOrder} dispatchWorkOrder={dispatchWorkOrder} usePopup={usePopup} />

            <Stack direction="horizontal" flexChildren>
              <Button title="Save & Print" onPress={() => saveWorkOrderQuery.mutate()} />
              <Button title="Print" />
              <Button title="Cancel" type="destructive" onPress={() => dismiss()} />
            </Stack>
          </Stack>
        </Stack>
      </ScrollView>
    </Screen>
  );
}

type WorkOrderAction =
  | {
      type: 'add-item' | 'remove-item' | 'update-item';
      item: WorkOrder['items'][number];
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
    const existingItem = workOrder.items?.find(item => item.productId === productId);
    if (existingItem) {
      action = {
        type: 'update-item',
        item: { ...existingItem, quantity: existingItem.quantity + action.item.quantity },
      };
    }
  }

  switch (action.type) {
    case 'add-item':
      return {
        ...workOrder,
        items: [...(workOrder.items ?? []), action.item],
      };

    case 'remove-item': {
      const productId = action.item.productId;
      return {
        ...workOrder,
        items: (workOrder.items ?? []).filter(item => item.productId !== productId),
      };
    }

    case 'update-item': {
      const updateItem = action.item;
      return {
        ...workOrder,
        items: (workOrder.items ?? []).map(item => (item.productId === updateItem.productId ? updateItem : item)),
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

const WorkOrderProperties = ({
  workOrder,
  dispatchWorkOrder,
  usePopup,
  navigate,
}: {
  workOrder: Partial<WorkOrder>;
  dispatchWorkOrder: Dispatch<WorkOrderAction>;
  usePopup: UsePopupFn;
  navigate: NavigateFn;
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
      <TextField label="Work Order ID" onFocus={() => navigate('WorkOrderSelector', {})} value={workOrder.id ?? ''} />
      <TextField
        label="Status"
        required
        placeholder="Status"
        onFocus={() => statusSelectorPopup.navigate()}
        value={workOrder.status}
      />
      <TextField
        label="Customer"
        required
        placeholder="Customer"
        onFocus={() => customerSelectorPopup.navigate()}
        value={workOrder.customer?.name ?? ''}
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
    workOrder.items
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
      <Button title="Add Item" type="primary" onPress={() => itemSelectorPopup.navigate()} />
      <SearchBar placeholder="Search items" initialValue={query} onTextChange={setQuery} onSearch={() => {}} />
      {rows.length ? (
        <List data={rows}></List>
      ) : (
        <Stack direction="horizontal" alignment="center" paddingVertical={'Large'}>
          <Text variant="body" color="TextSubdued">
            No items
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

  const depositSelectorPopup = usePopup('DepositSelector', result => {
    if (result.type === 'percentage') {
      setDepositPercentage(result.percentage);
    } else {
      setDepositPercentage(null);
    }

    dispatchWorkOrder({
      type: 'set-field',
      field: 'price',
      value: { ...price, deposit: result.currencyAmount },
    });
  });

  const discountSelectorPopup = usePopup('DiscountSelector', result => {
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
  });

  const shippingConfigPopup = usePopup('ShippingConfig', result => {
    dispatchWorkOrder({
      type: 'set-field',
      field: 'price',
      value: { ...price, shipping: result },
    });
  });

  const subTotal = workOrder.items?.map(item => item.unitPrice * item.quantity).reduce((a, b) => a + b, 0) ?? 0;
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
            onFocus={() => depositSelectorPopup.navigate({ subTotal })}
          />
          <NumberField
            label={discountLabel}
            value={'CA$ ' + price.discount.toFixed(2)}
            onFocus={() => discountSelectorPopup.navigate({ subTotal })}
          />
          <NumberField label={taxLabel} disabled value={'CA$ ' + price.tax.toFixed(2)} />
          <NumberField
            label="Shipping"
            value={'CA$ ' + price.shipping}
            onFocus={() => shippingConfigPopup.navigate()}
          />
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

const WorkOrderDescription = () => <TextArea rows={3} label="Description" />;

const WorkOrderAssignment = ({
  workOrder,
  dispatchWorkOrder,
  usePopup,
}: {
  workOrder: Partial<WorkOrder>;
  dispatchWorkOrder: Dispatch<WorkOrderAction>;
  usePopup: UsePopupFn;
}) => {
  const employeeSelectorPopup = usePopup('EmployeeSelector', result => {
    dispatchWorkOrder({ type: 'set-assigned-employees', employees: result });
  });

  const employeeNames = workOrder.employeeAssignments?.map(employee => employee.name).join(', ') ?? 'None';

  const setDueDate = (date: string) => {
    dispatchWorkOrder({ type: 'set-field', field: 'dueDate', value: new Date(date) });
  };

  return (
    <Stack direction="horizontal" flexChildren>
      <TextField label="Assigned Employees" onFocus={() => employeeSelectorPopup.navigate()} value={employeeNames} />
      <DateField label="Due date" value={workOrder.dueDate?.toDateString()} onChange={setDueDate} />
    </Stack>
  );
};
