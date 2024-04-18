import { Button } from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';

/**
 * Pagination controls for a list that grows to the right (i.e. only fetches next page).
 * Assumes that the initial page is already loaded/loading.
 */
export function PaginationControls({
  page,
  pageCount,
  onPageChange,
  hasNextPage: hasNextPageProp,
  isLoadingNextPage,
  onFetchNextPage,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  isLoadingNextPage: boolean;
  onFetchNextPage: () => void;
}) {
  const hasPreviousPage = page > 1;
  const hasNextPage = page < pageCount || hasNextPageProp;

  const onPreviousPageClick = () => {
    onPageChange(page - 1);
  };

  const onNextPageClick = () => {
    if (page === pageCount) {
      onFetchNextPage();
    }

    onPageChange(page + 1);
  };

  return (
    <ResponsiveStack direction={'horizontal'} flex={1} flexChildren spacing={0.5} paddingVertical={'Small'}>
      <Button title={'«'} type={'basic'} isDisabled={page <= 1} onPress={() => onPageChange(1)} />
      <Button title={'‹'} type={'basic'} isDisabled={!hasPreviousPage} onPress={onPreviousPageClick} />
      <Button title={String(page)} type={'basic'} isDisabled />
      <Button title={'›'} type={'basic'} isDisabled={!hasNextPage || isLoadingNextPage} onPress={onNextPageClick} />
      <Button title={'»'} type={'basic'} isDisabled={page >= pageCount} onPress={() => onPageChange(pageCount)} />
    </ResponsiveStack>
  );
}
