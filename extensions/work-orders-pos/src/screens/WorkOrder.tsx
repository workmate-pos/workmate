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
import { Dispatch, SetStateAction, useState } from 'react';
import { useScreen } from '../hooks/use-screen';

export type DashboardParams = {
  addItems?: WorkOrderItem[];
  removeItems?: { id: number }[];
  updateItems?: WorkOrderItem[];
  assignEmployee?: { id: number; name: string };
};

type WorkOrder = {
  id: number;
  status: string;
  customer: string;
  address: string;
};

export type WorkOrderItem = {
  id: number;
  sku: string;
  title: string;
  quantity: number;
  price: number;
};

type PriceInfo = {
  deposit?: number;
  discount?: { type: 'percentage'; value: number } | { type: 'amount'; value: number };
  taxPercentage?: number;
  shipping?: number;
};

export const WorkOrder = () => {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({});
  const [items, setItems] = useState<WorkOrderItem[]>([]);
  const [itemSearchText, setItemSearchText] = useState('');
  const [assignedEmployee, setAssignedEmployee] = useState<DashboardParams['assignEmployee'] | null>(null);

  // TODO: reducer
  const addItem = (newItem: WorkOrderItem) => {
    setItems(items => {
      const newItems = items.map(item =>
        item.id === newItem.id ? { ...item, quantity: item.quantity + newItem.quantity } : item,
      );

      if (newItems.some(item => item.id === newItem.id)) {
        return newItems;
      }

      return [...newItems, newItem];
    });
  };

  const removeItem = (id: number) => {
    setItems(items => items.filter(item => item.id !== id));
  };

  const updateItem = (updatedItem: WorkOrderItem) => {
    setItems(items => items.map(item => ({ ...item, ...(item.id === updatedItem.id ? updatedItem : {}) })));
  };

  const { Screen, usePopup } = useScreen('WorkOrder');
  const itemSelectorPopup = usePopup('ItemSelector', addItem);
  const itemConfigPopup = usePopup('ItemConfig', result => {
    if (result.type === 'remove') {
      return removeItem(result.item.id);
    } else if (result.type === 'update') {
      return updateItem(result.item);
    }
  });
  const employeeSelectorPopup = usePopup('EmployeeSelector', setAssignedEmployee);

  const itemListRows = items
    .filter(
      item =>
        !itemSearchText ||
        item.title.toLowerCase().includes(itemSearchText.toLowerCase()) ||
        item.sku.toLowerCase().includes(itemSearchText.toLowerCase()),
    )
    .map<ListRow>(item => ({
      id: String(item.id),
      onPress: () => {
        itemConfigPopup.navigate(item);
      },
      leftSide: {
        label: item.title,
        subtitle: [item.sku, `QTY: ${item.quantity}`],
      },
      rightSide: {
        label: `$${item.price * item.quantity}`,
        showChevron: true,
      },
    }));

  const subTotal = items.map(item => item.price * item.quantity).reduce((a, b) => a + b, 0);

  return (
    <Screen title="Work Order">
      <ScrollView>
        <WorkOrderProperties workOrder={workOrder} setWorkOrder={setWorkOrder} />

        <Stack direction="horizontal" flexChildren>
          <WorkOrderItems
            itemSelectorPopup={itemSelectorPopup}
            query={itemSearchText}
            setQuery={setItemSearchText}
            rows={itemListRows}
          />

          <Stack direction="vertical" flex={1} alignment="flex-start">
            <WorkOrderActions />
            <WorkOrderDescription />
            <WorkOrderAssignment employeeSelectorPopup={employeeSelectorPopup} assignedEmployee={assignedEmployee} />
            <WorkOrderMoney {...{ priceInfo, setPriceInfo, subTotal }} />
            <WorkOrderSubmit />
          </Stack>
        </Stack>
      </ScrollView>
    </Screen>
  );
};

const WorkOrderProperties = ({
  workOrder,
  setWorkOrder,
}: {
  workOrder: WorkOrder;
  setWorkOrder: Dispatch<SetStateAction<WorkOrder>>;
}) => {
  const updateWorkOrder = <K extends keyof WorkOrder>(field: K, value: WorkOrder[K]) => {
    setWorkOrder(workOrder => ({ ...workOrder, [field]: value }));
  };

  return (
    <Stack direction="horizontal" flexChildren>
      <NumberField
        label="Work Order #"
        required
        inputMode="numeric"
        placeholder="Work Order #"
        onChange={value => updateWorkOrder('id', value)}
        value={workOrder?.id}
      />
      <TextField
        label="Status"
        required
        placeholder="Status"
        onChange={value => updateWorkOrder('status', value)}
        value={workOrder?.status}
      />
      <TextField
        label="Customer"
        required
        placeholder="Customer"
        onChange={value => updateWorkOrder('customer', value)}
        value={workOrder?.customer}
      />
      <TextField
        label="Address"
        required
        placeholder="Address"
        onChange={value => updateWorkOrder('address', value)}
        value={workOrder?.address}
      />
    </Stack>
  );
};

const WorkOrderItems = ({ query, setQuery, rows, itemSelectorPopup }) => {
  return (
    <Stack direction="vertical" flex={1}>
      <Button title="Add Item" type="primary" onPress={() => itemSelectorPopup.navigate(undefined)} />
      <SearchBar placeholder="Search items" value={query} onTextChange={setQuery} onSearch={() => {}} />
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
  priceInfo,
  setPriceInfo,
  subTotal,
}: {
  priceInfo: PriceInfo;
  setPriceInfo: Dispatch<SetStateAction<PriceInfo>>;
  subTotal: number;
}) => {
  const discountPercentage =
    priceInfo.discount?.type === 'percentage'
      ? priceInfo.discount.value
      : priceInfo.discount?.type === 'amount'
      ? (priceInfo.discount.value / subTotal) * 100
      : 0;

  const discountAmount =
    priceInfo.discount?.type === 'amount'
      ? priceInfo.discount.value
      : priceInfo.discount?.type === 'percentage'
      ? (priceInfo.discount.value / 100) * subTotal
      : 0;

  const taxAmount = ((subTotal - discountAmount) * (priceInfo.taxPercentage ?? 0)) / 100;
  const total = subTotal - discountAmount + taxAmount + (priceInfo.shipping ?? 0);

  return (
    <Stack direction="vertical">
      <Stack direction="horizontal" flexChildren flex={1}>
        <Stack direction="vertical" flex={1}>
          <NumberField
            label="Deposit ($)"
            value={String(priceInfo.deposit ?? 0)}
            onChange={(value: string) =>
              setPriceInfo(priceInfo => ({
                ...priceInfo,
                deposit: Number(value),
              }))
            }
          />
          <NumberField
            label="Discount (%)"
            value={String(discountPercentage)}
            onChange={(value: string) =>
              setPriceInfo(priceInfo => ({
                ...priceInfo,
                discount: { type: 'percentage', value: Number(value) },
              }))
            }
          />
          <NumberField
            label="Tax (%)"
            value={String(priceInfo.taxPercentage ?? 0)}
            onChange={(value: string) =>
              setPriceInfo(priceInfo => ({
                ...priceInfo,
                taxPercentage: Number(value),
              }))
            }
          />
        </Stack>
        <Stack direction="vertical" flex={1}>
          <NumberField label="Sub Total ($)" disabled value={String(subTotal)} />
          <NumberField
            label="Discount ($)"
            value={String(discountAmount)}
            onChange={(value: string) =>
              setPriceInfo(priceInfo => ({
                ...priceInfo,
                discount: { type: 'amount', value: Number(value) },
              }))
            }
          />
          <NumberField label="Tax ($)" disabled value={String(taxAmount)} />
          <NumberField
            label="Shipping ($)"
            value={String(priceInfo.shipping ?? 0)}
            onChange={(value: string) =>
              setPriceInfo(priceInfo => ({
                ...priceInfo,
                shipping: Number(value),
              }))
            }
          />
        </Stack>
      </Stack>

      <Stack direction="horizontal" flexChildren>
        <NumberField label="Total" disabled value={String(total)} />
        <NumberField label="Balance Due" disabled value={String(total - (priceInfo.deposit ?? 0))} />
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

const WorkOrderAssignment = ({ assignedEmployee, employeeSelectorPopup }) => {
  return (
    <Stack direction="horizontal" flexChildren>
      <TextField
        label="Assigned Employee"
        required
        onFocus={() => employeeSelectorPopup.navigate()}
        value={assignedEmployee?.name}
      />
      <DateField label="Due date" />
    </Stack>
  );
};

const WorkOrderSubmit = () => (
  <Stack direction="horizontal" flexChildren>
    <Button title="Save & Print" />
    <Button title="Print" />
    <Button title="Cancel" type="destructive" />
  </Stack>
);
