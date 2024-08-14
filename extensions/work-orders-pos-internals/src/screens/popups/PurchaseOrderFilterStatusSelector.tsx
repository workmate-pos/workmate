import { Button, Stack } from '@shopify/retail-ui-extensions-react';
import { useRouter } from '../../routes.js';
import { PurchaseOrderStatus } from '@web/schemas/generated/work-order-pagination-options.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function PurchaseOrderFilterStatusSelector({
  onSelect,
}: {
  onSelect: (purchaseOrderStatus: PurchaseOrderStatus) => void;
}) {
  const router = useRouter();

  const statuses: PurchaseOrderStatus[] = ['FULFILLED', 'PENDING'];

  return (
    <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
      {statuses.map(status => (
        <Button
          key={status}
          title={titleCase(status)}
          onPress={() => {
            onSelect(status);
            router.popCurrent();
          }}
        />
      ))}
    </Stack>
  );
}
