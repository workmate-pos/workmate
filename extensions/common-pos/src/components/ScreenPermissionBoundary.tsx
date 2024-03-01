import { ReactNode } from 'react';
import { PermissionNode } from '@web/services/db/queries/generated/employee.sql.js';
import { PermissionBoundary } from './PermissionBoundary.js';
import { useScreen } from '@teifi-digital/pos-tools/router';

/**
 * Same as PermissionBoundary, but integrates with useScreen to make the screen load.
 */
export function ScreenPermissionBoundary({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: PermissionNode[];
}) {
  const screen = useScreen();

  return (
    <PermissionBoundary permissions={permissions} onIsLoading={isLoading => screen.setIsLoading(isLoading)}>
      {children}
    </PermissionBoundary>
  );
}
