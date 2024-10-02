import { useScreen } from '@teifi-digital/pos-tools/router';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useStockTransferQuery } from '@work-orders/common/queries/use-stock-transfer-query.js';
import { StockTransfer } from '../StockTransfer.js';
import { Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

export function ExistingStockTransfer({ name }: { name: string }) {
  const fetch = useAuthenticatedFetch();
  const stockTransferQuery = useStockTransferQuery({ fetch, name }, { staleTime: 0 });

  const screen = useScreen();
  screen.setTitle(name);
  screen.setIsLoading(stockTransferQuery.isFetching);

  if (stockTransferQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(stockTransferQuery.error, 'An error occurred while loading stock transfer')}
        </Text>
      </Stack>
    );
  }

  if (!stockTransferQuery.data || stockTransferQuery.isFetching) {
    return null;
  }

  return <StockTransfer initial={stockTransferQuery.data} />;
}
