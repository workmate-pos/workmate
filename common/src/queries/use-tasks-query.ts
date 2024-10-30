import { TaskPaginationOptions } from '@web/schemas/generated/task-pagination-options.js';
import { useInfiniteQuery, UseInfiniteQueryOptions, useQueryClient } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { GetTasksResponse, TaskResponse } from '@web/controllers/api/tasks.js';
import { UseQueryData } from './react-query.js';
import { DetailedTask, mapTask, useTaskQuery } from './use-task-query.js';

const PAGE_SIZE = 100;

type Filters = Omit<TaskPaginationOptions, 'limit' | 'offset' | `links${string}`> & {
  links?: Partial<DetailedTask['links']>;
};

export const useTasksQuery = (
  {
    fetch,
    filters,
  }: {
    fetch: Fetch;
    filters: Filters;
  },
  options?: Partial<
    UseInfiniteQueryOptions<
      { hasNextPage: boolean; tasks: DetailedTask[] },
      Error,
      TaskResponse[][],
      { hasNextPage: boolean; tasks: DetailedTask[] },
      (string | Filters)[],
      number
    >
  >,
) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    ...options,
    queryKey: ['task', 'list', filters],
    queryFn: async ({ pageParam: offset, signal }) => {
      const searchParams = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });

      const { query, sortMode, sortOrder, staffMemberIds, done } = filters;
      if (query) searchParams.set('query', query);
      if (sortMode) searchParams.set('sortMode', sortMode);
      if (sortOrder) searchParams.set('sortOrder', sortOrder);
      if (done !== undefined) searchParams.set('done', String(done));

      for (const [key, values] of Object.entries(filters.links ?? {})) {
        for (const value of values) {
          searchParams.append(`links.${key}`, value);
        }
      }

      for (const staffMemberId of staffMemberIds ?? []) {
        searchParams.append('staffMemberIds', staffMemberId);
      }

      const response = await fetch(`/api/tasks?${searchParams.toString()}`, { signal });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const { tasks, hasNextPage }: GetTasksResponse = await response.json();

      for (const task of tasks) {
        queryClient.setQueryData<UseQueryData<typeof useTaskQuery>>(['task', task.id], mapTask(task));
      }

      return {
        tasks: tasks.map(mapTask),
        hasNextPage,
      };
    },
    select: ({ pages }) => ({ pages: pages.map(page => page.tasks) }),
    initialPageParam: 0,
    getNextPageParam: ({ hasNextPage }, pages) => (!hasNextPage ? undefined : pages.flatMap(x => x.tasks).length),
  });
};
