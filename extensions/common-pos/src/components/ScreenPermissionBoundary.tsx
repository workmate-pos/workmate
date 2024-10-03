import { ReactNode } from 'react';
import { PermissionBoundary } from './PermissionBoundary.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { Permission } from '@web/services/permissions/permissions.js';

/**
 * Same as PermissionBoundary, but integrates with useScreen to make the screen load.
 */
export function ScreenPermissionBoundary({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: Permission[];
}) {
  const screen = useScreen();

  return (
    <PermissionBoundary permissions={permissions} onIsLoading={isLoading => screen.setIsLoading(isLoading)}>
      {children}
    </PermissionBoundary>
  );
}
