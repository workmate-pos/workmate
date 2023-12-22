import { QueryKey, useInfiniteQuery, UseInfiniteQueryOptions } from 'react-query';
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
}: {
  endpoint: string;
  queryKeyFn: (params: Params) => QueryKey;
  extractPage: (response: Response) => PageElement[];
  cursorParamName: keyof Params & string;
}) => {
  return ({
    fetch,
    params,
    options,
  }: {
    fetch: Fetch;
    params: Params;
    options?: Omit<
      UseInfiniteQueryOptions<Response, unknown, PageElement>,
      'queryKey' | 'queryFn' | 'select' | 'getNextPageParam'
    >;
  }) => {
    return useInfiniteQuery<Response, unknown, PageElement>({
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

        return await response.json();
      },
      select: ({ pages, pageParams }) => ({
        pages: pages.flatMap(page => extractPage(page)),
        pageParams,
      }),
      getNextPageParam: lastPage => {
        if (!lastPage.pageInfo.hasNextPage) return undefined;
        return lastPage.pageInfo.endCursor;
      },
    });
  };
};
