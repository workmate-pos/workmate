import { ReactNode, useEffect } from 'react';
import { PermissionNode } from '@web/services/db/queries/generated/employee.sql.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { Stack, Text } from '@shopify/retail-ui-extensions-react';
import { extractErrorMessage } from '../util/errors.js';

/**
 * Wrapper component that only renders children if the user has the required permissions.
 */
export function PermissionBoundary({
  children,
  permissions,
  onIsLoading,
}: {
  children: ReactNode;
  permissions: PermissionNode[];
  onIsLoading?: (isLoading: boolean) => void;
}) {
  const fetch = useAuthenticatedFetch();
  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });

  useEffect(() => {
    onIsLoading?.(currentEmployeeQuery.isLoading);
  }, [currentEmployeeQuery.isLoading]);

  if (currentEmployeeQuery.isLoading) {
    return null;
  }

  if (currentEmployeeQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(currentEmployeeQuery.error, 'An error occurred while employee details')}
        </Text>
      </Stack>
    );
  }

  if (!currentEmployeeQuery.data) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          Received no data from server
        </Text>
      </Stack>
    );
  }

  const superuser = currentEmployeeQuery.data.superuser;
  const missingEmployeePermissions = superuser
    ? []
    : permissions.filter(permission => !currentEmployeeQuery.data?.permissions?.includes(permission));

  if (missingEmployeePermissions.length > 0) {
    return (
      <Stack direction={'vertical'}>
        <Stack direction={'horizontal'} alignment={'center'} flex={1} flexChildren>
          <Text variant={'headingLarge'}>You do not have permission to view this page.</Text>
        </Stack>
        <Stack direction={'horizontal'} alignment={'center'} flex={1} flexChildren>
          <Text color={'TextSubdued'}>
            You are missing the following permissions:{' '}
            <Text color={'TextNeutral'}>{missingEmployeePermissions.join(', ')}</Text>
          </Text>
        </Stack>
      </Stack>
    );
  }

  return <>{children}</>;
}
