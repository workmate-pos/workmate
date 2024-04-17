import { Button, Stack } from '@shopify/retail-ui-extensions-react';
import { useRouter } from '../../routes.js';
import { OverdueStatus } from '@work-orders/common/queries/use-work-order-info-query.js';

export function OverdueStatusSelector({ onSelect }: { onSelect: (overdueStatus: OverdueStatus) => void }) {
  const router = useRouter();

  return (
    <Stack alignment="center" direction="vertical" flex={1} paddingHorizontal="ExtraExtraLarge">
      <Button
        title={'Not overdue'}
        onPress={() => {
          onSelect('NOT_OVERDUE');
          router.popCurrent();
        }}
      />

      <Button
        title={'Overdue'}
        onPress={() => {
          onSelect('OVERDUE');
          router.popCurrent();
        }}
      />
    </Stack>
  );
}
