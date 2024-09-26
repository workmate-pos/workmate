import { TaskPaginationOptions } from '@web/schemas/generated/task-pagination-options.js';
import { useInfiniteQuery, UseInfiniteQueryOptions, useQueryClient } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { GetTasksResponse, TaskResponse } from '@web/controllers/api/tasks.js';
import { UseQueryData } from './react-query.js';
import { mapTask, useTaskQuery } from './use-task-query.js';
import { Task } from '@web/services/tasks/queries.js';

const PAGE_SIZE = 100;

export const useTasksQuery = (
  {
    fetch,
    filters,
  }: {
    fetch: Fetch;
    filters: Omit<TaskPaginationOptions, 'limit' | 'offset'>;
  },
  options?: Partial<
    UseInfiniteQueryOptions<
      { hasNextPage: boolean; tasks: Task[] },
      Error,
      TaskResponse[][],
      { hasNextPage: boolean; tasks: Task[] },
      (string | Omit<TaskPaginationOptions, 'limit' | 'offset'>)[],
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

      const { query, sortMode, sortOrder, staffMemberId, done } = filters;
      if (query) searchParams.set('query', query);
      if (sortMode) searchParams.set('sortMode', sortMode);
      if (sortOrder) searchParams.set('sortOrder', sortOrder);
      if (staffMemberId) searchParams.set('staffMemberId', staffMemberId);
      if (done !== undefined) searchParams.set('done', String(done));

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
    select: ({ pages }) => pages.map(page => page.tasks),
    initialPageParam: 0,
    getNextPageParam: ({ hasNextPage }, pages) => (!hasNextPage ? undefined : pages.flatMap(x => x.tasks).length),
  });
};
