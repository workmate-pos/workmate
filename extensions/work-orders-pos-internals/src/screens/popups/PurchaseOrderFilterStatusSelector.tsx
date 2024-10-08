import { Button, Stack } from '@shopify/ui-extensions-react/point-of-sale';
import { useRouter } from '../../routes.js';
import { PurchaseOrderStatus } from '@web/schemas/generated/work-order-pagination-options.js';
import { sentenceCase, titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function PurchaseOrderFilterStatusSelector({
  onSelect,
}: {
  onSelect: (purchaseOrderStatus: PurchaseOrderStatus) => void;
}) {
  const router = useRouter();

  const statuses: PurchaseOrderStatus[] = ['fulfilled', 'pending'];

  return (
    <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
      {statuses.map(status => (
        <Button
          key={status}
          title={sentenceCase(status)}
          onPress={() => {
            onSelect(status);
            router.popCurrent();
          }}
        />
      ))}
    </Stack>
  );
}
