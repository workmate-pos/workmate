import { Button, Stack } from '@shopify/retail-ui-extensions-react';
import { PaymentStatus } from '@web/schemas/generated/work-order-pagination-options.js';
import { useRouter } from '../../routes.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function PaymentStatusSelector({ onSelect }: { onSelect: (status: PaymentStatus) => void }) {
  const statuses: PaymentStatus[] = ['UNPAID', 'PARTIALLY_PAID', 'FULLY_PAID'];

  const router = useRouter();

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
