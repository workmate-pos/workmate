import { useScreen } from '../../hooks/use-screen';
import { List, ListRow, ScrollView, SearchBar } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useQuery } from 'react-query';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch';

export type WorkOrderSelectorParams = {
  filter?: 'active' | 'historical';
};

type FetchedWorkOrder = {
  name: string;
  status: string;
  discountAmount: number;
  depositAmount: number;
  taxAmount: number;
  products: {
    unitPrice: number;
    quantity: number;
  }[];
};

export function WorkOrderSelector() {
  const [params, setParams] = useState<WorkOrderSelectorParams | null>(null);

  const { Screen, navigate } = useScreen('WorkOrderSelector', setParams);

  const title = params?.filter ? `${titleCase(params.filter)} Work Orders` : 'Work Orders';
  const [query, setQuery] = useState<string | null>(null);

  const [workOrders, setWorkOrders] = useState<FetchedWorkOrder[]>([]);

  const fetch = useAuthenticatedFetch();
  const getWorkOrdersQuery = useQuery(
    [],
    (): Promise<{ workOrders: FetchedWorkOrder[] }> => fetch('/api/work-order').then(res => res.json()),
    {
      onSuccess({ workOrders }) {
        setWorkOrders(workOrders);
      },
    },
  );

  const rows = workOrders.map<ListRow>(({ name, products, discountAmount, taxAmount, status }) => {
    const productTotal = products.reduce((total, { unitPrice, quantity }) => total + unitPrice * quantity, 0);
    const total = productTotal + taxAmount - discountAmount;

    return {
      id: name,
      onPress: () => {
        navigate('WorkOrder', { type: 'load-work-order', name });
      },
      leftSide: {
        label: name,
        subtitle: [`CA$ ${(total / 100).toFixed(2)}`, status],
      },
      rightSide: {
        showChevron: true,
      },
    };
  });

  return (
    <Screen title={title} isLoading={!getWorkOrdersQuery.data && !getWorkOrdersQuery.isError}>
      <ScrollView>
        <SearchBar onTextChange={setQuery} onSearch={() => {}} placeholder="Search work orders" />
        <List data={rows} />
      </ScrollView>
    </Screen>
  );
}

function titleCase(str: string) {
  return str[0].toUpperCase() + str.slice(1);
}
