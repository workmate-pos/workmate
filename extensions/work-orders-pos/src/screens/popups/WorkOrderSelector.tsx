import { useScreen } from '../../hooks/use-screen';
import { List } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';

export type WorkOrderSelectorParams = {
  filter: 'active' | 'historical';
};

export const WorkOrderSelector = () => {
  const [params, setParams] = useState<WorkOrderSelectorParams | null>(null);

  const { Screen } = useScreen('WorkOrderSelector', setParams);

  const title = params ? `${params.filter} Work Orders` : 'Work Orders';

  // TODO: load work orders from database

  return (
    <Screen title={title}>
      <List data={[]} />
    </Screen>
  );
};
