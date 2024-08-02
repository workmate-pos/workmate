import { Dispatch, SetStateAction } from 'react';
import { UseInfiniteQueryResult } from 'react-query/types/react/types.js';

export function getInfiniteQueryPagination<T extends UseInfiniteQueryResult>(
  pageIndex: number,
  setPageIndex: Dispatch<SetStateAction<number>>,
  query: T,
) {
  const isFirstPage = pageIndex <= 0;
  const isLastPage = query.data && pageIndex >= query.data.pages.length - 1;

  return {
    hasNextPage: !isLastPage || (!query.isFetchingNextPage && query.hasNextPage),
    next: () => {
      if (isLastPage) {
        if (query.isFetchingNextPage) {
          return;
        }

        if (query.hasNextPage) {
          query.fetchNextPage();
          setPageIndex(pageIndex + 1);
        }

        return;
      }

      setPageIndex(pageIndex + 1);
    },
    hasPreviousPage: !isFirstPage,
    previous: () => {
      if (!isFirstPage) {
        setPageIndex(pageIndex - 1);
      }
    },
  };
}
