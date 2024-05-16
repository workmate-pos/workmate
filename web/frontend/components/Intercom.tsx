import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { ReactNode, useEffect } from 'react';
import * as intercom from 'react-use-intercom';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';

export function Intercom({ children }: { children: ReactNode }) {
  const fetch = useAuthenticatedFetch({
    setToastAction: () => {},
    reauthOptions: { redirect: false },
  });

  const { boot } = intercom.useIntercom();
  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });

  useEffect(() => {
    if (!currentEmployeeQuery.data) return;
    const currentEmployee = currentEmployeeQuery.data;
    const intercomUser = currentEmployee.intercomUser;
    boot({
      name: currentEmployee.name,
      ...intercomUser,
    });
  }, [currentEmployeeQuery.data]);

  return children;
}
