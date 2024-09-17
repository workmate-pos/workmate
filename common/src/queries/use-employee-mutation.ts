import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import type { UpsertEmployees } from '@web/schemas/generated/upsert-employees.js';
import type { UpsertEmployeesResponse } from '@web/controllers/api/employee.js';

export const useEmployeeMutation = (
  { fetch }: { fetch: Fetch },
  options: UseMutationOptions<UpsertEmployeesResponse, unknown, UpsertEmployees, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ['upsert-employees'],
    mutationFn: async (body: UpsertEmployees) => {
      const response = await fetch('/api/employee', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mutate update employee');
      }

      const result: UpsertEmployeesResponse = await response.json();
      return result;
    },
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });

      options.onSuccess?.(...args);
    },
  });
};
