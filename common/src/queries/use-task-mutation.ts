import { Fetch } from './fetch.js';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { UseQueryData } from './react-query.js';
import { DateTime, UpsertTask } from '@web/schemas/generated/upsert-task.js';
import { GetTaskResponse } from '@web/controllers/api/tasks.js';
import { mapTask, useTaskQuery } from './use-task-query.js';
import { Task } from '@web/services/tasks/queries.js';

export const useTaskMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<
    Task,
    Error,
    Omit<UpsertTask, 'deadline'> & { deadline: Date | null; id: number | null },
    UseQueryData<typeof useTaskQuery>
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ['task'],
    mutationFn: async ({
      id,
      ...body
    }: Omit<UpsertTask, 'deadline'> & { deadline: Date | null; id: number | null }) => {
      const response = await fetch(`/api/tasks/${id === null ? '' : encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          deadline: body.deadline ? (body.deadline.toISOString() as DateTime) : null,
        } satisfies UpsertTask),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mutate employee schedule item');
      }

      const task: GetTaskResponse = await response.json();
      return mapTask(task);
    },
    // Optimistically update the query cache and fix it on success/error
    async onMutate(...args) {
      const [task] = args;

      const currentTask = queryClient.getQueryData<UseQueryData<typeof useTaskQuery>>(['task', task.id]);

      await options?.onMutate?.(...args);

      if (currentTask) {
        const { name, description, deadline, done, estimatedTimeMinutes } = task;
        queryClient.setQueryData<UseQueryData<typeof useTaskQuery>>(['task', task.id], {
          ...currentTask,
          name,
          description,
          deadline,
          done,
          estimatedTimeMinutes,
          updatedAt: new Date(),
        });

        return currentTask;
      }
    },
    async onSuccess(task, ...args) {
      // prevent overriding the query data if we are mutating elsewhere
      // if we would override we would mess up other optimistic updates
      const isMutating = queryClient.isMutating({
        mutationKey: ['task'],
        predicate: mutation => mutation.state.variables.id === task.id,
      });

      if (!isMutating) {
        queryClient.setQueryData<UseQueryData<typeof useTaskQuery>>(['task', task.id], task);
      }

      await options?.onSuccess?.(task, ...args);
      await queryClient.invalidateQueries({ queryKey: ['task', 'list'] });
    },
    async onError(_1, _2, previousValue, ...args) {
      if (previousValue) {
        queryClient.setQueryData<UseQueryData<typeof useTaskQuery>>(['task', previousValue.id], previousValue);
      }

      await options?.onError?.(_1, _2, previousValue, ...args);
    },
  });
};
