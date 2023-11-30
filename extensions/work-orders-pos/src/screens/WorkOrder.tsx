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
import { UsePopupFn, useScreen } from '../hooks/use-screen';
import type { CreateWorkOrder } from '../schemas/generated/create-work-order';
import { useSaveWorkOrderMutation, WorkOrderValidationErrors } from '../queries/use-save-work-order-mutation';
import { useCurrencyFormatter } from '../hooks/use-currency-formatter';
import { useWorkOrderQuery } from '../queries/use-work-order-query';
import { usePaymentHandler } from '../hooks/use-payment-handler';
import { getPriceDetails } from '../util/work-order';

export type WorkOrder = Omit<CreateWorkOrder, 'products' | 'employeeAssignments' | 'dueDate' | 'customer'> & {
  products: ({ name: string; sku: string; imageUrl?: string } & CreateWorkOrder['products'][number])[];
  employeeAssignments: ({ name: string } & NonNullable<CreateWorkOrder['employeeAssignments']>[number])[];
  dueDate: string;
  customer: { name: string } & CreateWorkOrder['customer'];
  payments: { type: 'DEPOSIT' | 'BALANCE'; amount: number }[];
};

export type WorkOrderItem = WorkOrder['products'][number];
export type WorkOrderEmployee = WorkOrder['employeeAssignments'][number];
export type WorkOrderCustomer = WorkOrder['customer'];
export type WorkOrderStatus = WorkOrder['status'];

export function WorkOrder() {
  const [title, setTitle] = useState('');
  const [workOrderName, setWorkOrderName] = useState<string | null>(null);
  const [workOrder, dispatchWorkOrder] = useReducer(workOrderReducer, {});
  const [savedPriceDetails, setSavedPriceDetails] = useState(getPriceDetails(workOrder));

  const workOrderQuery = useWorkOrderQuery(workOrderName, {
    onSuccess(workOrder) {
      if (!workOrder) return;
      dispatchWorkOrder({ type: 'set-work-order', workOrder });
      setSavedPriceDetails(getPriceDetails(workOrder));
    },
  });

  const { Screen, usePopup } = useScreen('WorkOrder', async action => {
    removeVisualHints();

    if (action.type === 'new-work-order') {
      setTitle('New Work Order');
      dispatchWorkOrder({ type: 'reset-work-order' });
    } else if (action.type === 'load-work-order') {
      setTitle(`Edit Work Order ${action.name}`);
      setWorkOrderName(action.name);
    }
  });

  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [validationErrors, setValidationErrors] = useState<null | WorkOrderValidationErrors>(null);

  // TODO: Don't allow payment if its initially allowed, but then the prices change

  const workOrderSavedPopup = usePopup('WorkOrderSaved');
  const depositSelectorPopup = usePopup('DiscountOrDepositSelector', async result => {
    if (result.select === 'deposit') {
      paymentHandler.handlePayment({
        workOrderName: workOrder!.name!,
        type: 'deposit',
        amount: result.currencyAmount,
      });
    }
  });

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

            <Stack direction="horizontal" flexChildren>
              {workOrder.name && savedPriceDetails.balanceDue > 0 && (
                <>
                  <Button
                    title="Pay Balance"
                    onPress={() =>
                      paymentHandler.handlePayment({
                        workOrderName: workOrder.name!,
                        type: 'balance',
                        amount: savedPriceDetails.total,
                        previouslyDeposited: savedPriceDetails.deposited,
                      })
                    }
                  />
                  {savedPriceDetails.deposited === 0 && (
                    <Button
                      title="Pay Deposit"
                      onPress={() =>
                        depositSelectorPopup.navigate({
                          select: 'deposit',
                          subTotal: savedPriceDetails.subTotal,
                        })
                      }
                    />
                  )}
                </>
              )}
              <Button
                title={workOrder.name ? 'Update Order' : 'Create Order'}
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
    const productVariantId = action.item.productVariantId;
    const existingItem = workOrder.products?.find(item => item.productVariantId === productVariantId);
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
      const productVariantId = action.item.productVariantId;
      return {
        ...workOrder,
        products: (workOrder.products ?? []).filter(item => item.productVariantId !== productVariantId),
      };
    }

    case 'update-item': {
      const updateItem = action.item;
      return {
        ...workOrder,
        products: (workOrder.products ?? []).map(item =>
          item.productVariantId === updateItem.productVariantId ? updateItem : item,
        ),
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
  price: {
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
  const currencyFormatter = useCurrencyFormatter();

  const rows: ListRow[] =
    workOrder.products
      ?.filter(
        item =>
          !query ||
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.sku.toLowerCase().includes(query.toLowerCase()),
      )
      .map<ListRow>(item => ({
        id: item.productVariantId,
        onPress: () => {
          itemConfigPopup.navigate(item);
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
      })) ?? [];

  return (
    <Stack direction="vertical" flex={1} paddingVertical={'ExtraSmall'}>
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
            <NumberField label={'Deposited'} disabled={true} value={currencyFormatter(deposited)} />
            <NumberField label={'Paid'} disabled={true} value={currencyFormatter(paid - deposited)} />
          </Stack>
        </Stack>

        <NumberField label="Balance Due" disabled value={currencyFormatter(balanceDue)} />
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
