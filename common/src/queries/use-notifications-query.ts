import { FetchNotificationsPageResponse } from '@web/controllers/api/notifications.js';
import { NotificationsPaginationOptions } from '@web/schemas/generated/notifications-pagination-options.js';
import { Fetch } from './fetch.js';
import { omit } from '@teifi-digital/shopify-app-toolbox/object';
import { useInfiniteQuery, UseInfiniteQueryOptions } from 'react-query';

export const useNotificationsQuery = (
  { fetch, filters }: { fetch: Fetch; filters: NotificationsPaginationOptions },
  options?: UseInfiniteQueryOptions<
    FetchNotificationsPageResponse,
    unknown,
    FetchNotificationsPageResponse['notifications'],
    FetchNotificationsPageResponse,
    (string | Omit<NotificationsPaginationOptions, 'offset' | 'limit'>)[]
  >,
) =>
  useInfiniteQuery({
    ...options,
    queryKey: ['notifications', omit(filters, 'offset', 'limit')],
    queryFn: async ({ pageParam: offset = 0 }) => {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries({ ...filters, offset })) {
        if (value === undefined) continue;
        searchParams.set(key, String(value));
      }

      const response = await fetch(`/api/notifications?${searchParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const result: FetchNotificationsPageResponse = await response.json();
      return result;
    },
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasNextPage) return undefined;
      return pages.flat(1).length;
    },
    select: ({ pages, pageParams }) => ({
      pages: pages.map(page => page.notifications),
      pageParams,
    }),
  });
