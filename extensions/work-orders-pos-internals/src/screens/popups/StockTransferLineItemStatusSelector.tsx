import { CreateStockTransferLineItemStatus } from '@web/schemas/generated/create-stock-transfer.js';
import { Button, ScrollView } from '@shopify/retail-ui-extensions-react';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useRouter } from '../../routes.js';

export function StockTransferLineItemStatusSelector({
  onSelect,
}: {
  onSelect: (status: CreateStockTransferLineItemStatus) => void;
}) {
  const router = useRouter();

  const statuses: CreateStockTransferLineItemStatus[] = ['PENDING', 'IN_TRANSIT', 'RECEIVED', 'REJECTED'];

  return (
    <ScrollView>
      <ResponsiveGrid columns={1} paddingHorizontal="ExtraExtraLarge">
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
      </ResponsiveGrid>
    </ScrollView>
  );
}
