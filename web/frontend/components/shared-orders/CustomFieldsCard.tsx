import { Card } from '@shopify/polaris';
import { CustomFieldsList, CustomFieldsListProps } from '@web/frontend/components/shared-orders/CustomFieldsList.js';

export function CustomFieldsCard(props: CustomFieldsListProps) {
  return (
    <Card>
      <CustomFieldsList {...props} />
    </Card>
  );
}
