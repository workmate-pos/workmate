import { Card, EmptyState } from '@shopify/polaris';
import { emptyState } from '../assets/index.js';

export function NoPermissionCard({ missingPermissions }: { missingPermissions?: string[] }) {
  return (
    <Card>
      <EmptyState heading="No Permission" image={emptyState}>
        <p>You do not have permission to view this page.</p>
        {!!missingPermissions?.length && (
          <p>
            You are missing the following permissions: <strong>{missingPermissions.join(', ')}</strong>
          </p>
        )}
      </EmptyState>
    </Card>
  );
}
