import { skipToken, useQueries, useQuery } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { GetTaskResponse } from '@web/controllers/api/tasks.js';
import { Task } from '@web/services/tasks/queries.js';

export const useTaskQuery = ({ fetch, id }: { fetch: Fetch; id: number | null }) =>
  useQuery({
    queryKey: ['task', id],
    queryFn:
      id === null
        ? skipToken
        : async () => {
            const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`);
            const task: GetTaskResponse = await response.json();
            return mapTask(task);
          },
  });

export const useTaskQueries = ({ fetch, ids }: { fetch: Fetch; ids: number[] }) => {
  const queries = useQueries({
    queries: ids.map(id => ({
      queryKey: ['task', id],
      queryFn: async () => {
        const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`);
        const task: GetTaskResponse = await response.json();
        return mapTask(task);
      },
    })),
  });
  return Object.fromEntries(ids.map((id, i) => [id, queries[i]!]));
};

export function mapTask(task: GetTaskResponse) {
  return {
    ...task,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
    deadline: task.deadline ? new Date(task.deadline) : null,
  };
}

export type DetailedTask = ReturnType<typeof mapTask>;
