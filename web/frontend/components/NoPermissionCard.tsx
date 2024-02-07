import { Card, EmptyState } from '@shopify/polaris';
import { emptyState } from '../assets/index.js';

export function NoPermissionCard() {
  return (
    <Card>
      <EmptyState heading="No Permission" image={emptyState}>
        <p>You do not have permission to view this page.</p>
      </EmptyState>
    </Card>
  );
}
