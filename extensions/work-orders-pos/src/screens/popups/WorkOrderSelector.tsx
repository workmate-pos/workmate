import { useScreen } from '../../hooks/use-screen';
import { List, ListRow, ScrollView, SearchBar } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useQuery } from 'react-query';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch';

export type WorkOrderSelectorParams = {
  filter?: 'active' | 'historical';
};

export function WorkOrderSelector() {
  const [params, setParams] = useState<WorkOrderSelectorParams | null>(null);

  const { Screen } = useScreen('WorkOrderSelector', setParams);

  const title = params?.filter ? `${titleCase(params.filter)} Work Orders` : 'Work Orders';
  const [query, setQuery] = useState<string | null>(null);

  type WorkOrderInfo = { id: string; itemCount: number; assignmentCount: number };
  const [workOrders, setWorkOrders] = useState<WorkOrderInfo[]>([]);

  const fetch = useAuthenticatedFetch();
  const getWorkOrdersQuery = useQuery(
    [],
    (): Promise<{ workOrders: WorkOrderInfo[] }> => fetch('/api/work-order').then(res => res.json()),
    {
      onSuccess({ workOrders }) {
        setWorkOrders(workOrders);
      },
    },
  );

  const rows = workOrders.map<ListRow>(({ id, itemCount, assignmentCount }) => ({
    id: id,
    onPress: () => {},
    leftSide: {
      label: id,
      subtitle: [`${itemCount} items`, `${assignmentCount} assignments`],
    },
    rightSide: {
      showChevron: true,
    },
  }));

  return (
    <Screen title={title} isLoading={getWorkOrdersQuery.isLoading}>
      <ScrollView>
        <SearchBar onTextChange={setQuery} onSearch={() => {}} placeholder="Search customers" />
        <List data={rows} />
      </ScrollView>
    </Screen>
  );
}

function titleCase(str: string) {
  return str[0].toUpperCase() + str.slice(1);
}
