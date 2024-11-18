import { ResourceListPaginationProps } from '@shopify/polaris/build/ts/src/components/ResourceList/index.js';
import { useCallback, useMemo, useState } from 'react';

/**
 * Returns an object that can be used for paginating complete lists.
 * To paginate infinite lists, see {@link useInfinitePagination}.
 */
export function useStaticPagination<T>(
  collection: T[],
  pageSize: number,
  initialPageIndex: number = 0,
): ResourceListPaginationProps & { page: T[]; reset: () => void } {
  const [pageIndex, setPageIndex] = useState(initialPageIndex);

  const page = useMemo(
    () => collection.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [collection, pageIndex, pageSize],
  );
  const onNext = useCallback(() => setPageIndex(pageIndex => pageIndex + 1), []);
  const onPrevious = useCallback(() => setPageIndex(pageIndex => pageIndex - 1), []);
  const hasPrevious = pageIndex > 0;
  const hasNext = collection.length > (pageIndex + 1) * pageSize;
  const reset = useCallback(() => setPageIndex(0), []);

  return {
    page,
    onNext,
    onPrevious,
    hasPrevious,
    hasNext,
    reset,
  };
}

/**
 * Returns an object that can be used for paginating infinite lists.
 * To paginate complete lists, see {@link useStaticPagination}.
 */
export function useInfinitePagination<T>(
  {
    pages,
    hasNext: _hasNext,
    onNext: _onNext,
  }: {
    pages: T[];
    hasNext: boolean;
    onNext: () => void;
  },
  initialPageIndex: number = 0,
): ResourceListPaginationProps & {
  page: T | undefined;
  reset: () => void;
} {
  const [pageIndex, setPageIndex] = useState(initialPageIndex);

  const page = useMemo(() => pages[pageIndex], [pages, pageIndex]);
  const onNext = useCallback(() => {
    if (pageIndex === pages.length - 1) {
      _onNext();
    }

    setPageIndex(pageIndex + 1);
  }, [pages, pageIndex, _onNext]);
  const onPrevious = useCallback(() => setPageIndex(pageIndex => pageIndex - 1), []);
  const hasPrevious = pageIndex > 0;
  const hasNext = pageIndex < pages.length - 1 || _hasNext;
  const reset = useCallback(() => setPageIndex(0), []);

  return {
    page,
    onNext,
    onPrevious,
    hasPrevious,
    hasNext,
    reset,
  };
}
