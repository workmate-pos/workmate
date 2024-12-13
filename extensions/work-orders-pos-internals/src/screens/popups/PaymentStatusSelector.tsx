import { Button, Stack } from '@shopify/ui-extensions-react/point-of-sale';
import { PaymentStatus } from '@web/schemas/generated/work-order-pagination-options.js';
import { useRouter } from '../../routes.js';
import { sentenceCase, titleCase } from '@teifi-digital/shopify-app-toolbox/string';

export function PaymentStatusSelector({ onSelect }: { onSelect: (status: PaymentStatus) => void }) {
  const statuses: PaymentStatus[] = ['unpaid', 'partially-paid', 'fully-paid'];

  const router = useRouter();

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
