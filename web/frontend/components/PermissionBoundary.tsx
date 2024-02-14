import { ReactNode } from 'react';
import type { PermissionNode } from '@web/services/db/queries/generated/employee.sql.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { Loading } from '@shopify/app-bridge-react';
import { NoPermissionCard } from '@web/frontend/components/NoPermissionCard.js';

/**
 * Wrapper component that only shows children if the user has the required permissions.
 */
export function PermissionBoundary({ children, permissions }: { children: ReactNode; permissions: PermissionNode[] }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });

  if (currentEmployeeQuery.isLoading) {
    return (
      <>
        <Loading />
        {toast}
      </>
    );
  }

  const superuser = currentEmployeeQuery.data?.superuser ?? false;
  const missingEmployeePermissions = superuser
    ? []
    : permissions.filter(permission => !currentEmployeeQuery.data?.permissions?.includes(permission));

  if (missingEmployeePermissions.length > 0 && !superuser) {
    return (
      <>
        <NoPermissionCard missingPermissions={missingEmployeePermissions} />
        {toast}
      </>
    );
  }

  return (
    <>
      {children}
      {toast}
    </>
  );
}
