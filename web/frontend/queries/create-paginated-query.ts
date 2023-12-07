import { QueryKey, useInfiniteQuery, UseInfiniteQueryOptions } from 'react-query';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';

export type PageInfo = {
  hasNextPage: boolean;
  endCursor?: string | null;
};

type ArrayPropertyKey<T> = {
  [K in keyof T]: T[K] extends Array<any> ? K : never;
}[keyof T];

type ArrayElementType<T> = T extends readonly (infer InnerArr)[] ? InnerArr : never;

// TODO: use this everywhere possible
export const createPaginatedQuery = <Params extends {}, Response extends { pageInfo: PageInfo }>({
  endpoint,
  queryKeyFn,
  pagePropertyName,
  cursorParamName,
}: {
  endpoint: string;
  queryKeyFn: (params: Params) => QueryKey;
  pagePropertyName: ArrayPropertyKey<Response>;
  cursorParamName: keyof Params & string;
}) => {
  return (
    params: Params,
    options?: Omit<
      UseInfiniteQueryOptions<Response, unknown, ArrayElementType<Response[ArrayPropertyKey<Response>]>>,
      'queryKey' | 'queryFn' | 'select' | 'getNextPageParam'
    >,
  ) => {
    const fetch = useAuthenticatedFetch();

    return useInfiniteQuery<Response, unknown, ArrayElementType<Response[ArrayPropertyKey<Response>]>>({
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
        pages: pages.flatMap(page => page[pagePropertyName]) as ArrayElementType<
          Response[ArrayPropertyKey<Response>]
        >[],
        pageParams,
      }),
      getNextPageParam: lastPage => {
        if (!lastPage.pageInfo.hasNextPage) return undefined;
        return lastPage.pageInfo.endCursor;
      },
    });
  };
};
