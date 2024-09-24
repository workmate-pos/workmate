import { InfiniteData, QueryKey, useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { Fetch } from './fetch.js';

export type PageInfo = {
  hasNextPage: boolean;
  endCursor?: string | null;
};

export const createPaginatedQuery = <Params extends {}, Response extends { pageInfo: PageInfo }, PageElement>({
  endpoint,
  queryKeyFn,
  extractPage,
  cursorParamName,
  options: baseOptions,
}: {
  endpoint: string;
  queryKeyFn: (params: Params) => QueryKey;
  extractPage: (response: Response) => PageElement[];
  cursorParamName: keyof Params & string;
  options?: Omit<
    UseInfiniteQueryOptions<Response, unknown, InfiniteData<PageElement[]>>,
    'queryKey' | 'queryFn' | 'select' | 'getNextPageParam'
  >;
}) => {
  return ({
    fetch,
    params,
    options,
  }: {
    fetch: Fetch;
    params: Params;
    options?: Omit<
      UseInfiniteQueryOptions<Response, unknown, InfiniteData<PageElement[]>>,
      'queryKey' | 'queryFn' | 'select' | 'getNextPageParam' | 'initialPageParam'
    > & {
      /**
       * react query removed this lol so just add it back
       */
      onSuccess?: (response: Response) => void | Promise<void>;
    };
  }) => {
    return useInfiniteQuery({
      ...baseOptions,
      ...options,
      queryKey: queryKeyFn(params),
      queryFn: async ({ pageParam }): Promise<Response> => {
        const searchParams = new URLSearchParams();

        for (const [key, value] of Object.entries(params)) {
          if (value === undefined) continue;
          searchParams.set(key, String(value));
        }

        if (pageParam) searchParams.set(cursorParamName, String(pageParam));

        const response = await fetch(`${endpoint}?${searchParams}`);
        const data: Response = await response.json();
        await options?.onSuccess?.(data);
        return data;
      },
      initialPageParam: undefined as undefined | string,
      select: ({ pages, pageParams }) => ({
        pages: pages.map(page => extractPage(page)),
        pageParams,
      }),
      getNextPageParam: lastPage => {
        if (!lastPage.pageInfo.hasNextPage) return undefined;
        return lastPage.pageInfo.endCursor;
      },
    });
  };
};
