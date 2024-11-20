import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { CreateCycleCount } from '@web/schemas/generated/create-cycle-count.js';
import { CreateCycleCountResponse } from '@web/controllers/api/cycle-count.js';
import { UseQueryData } from './react-query.js';
import { useCycleCountQuery } from './use-cycle-count-query.js';

/**
 * Cleans CreateCycleCount data by selecting only the required properties
 */
const cleanCreateCycleCount = (data: CreateCycleCount): CreateCycleCount => {
  return {
    name: data.name,
    status: data.status,
    locationId: data.locationId,
    note: data.note,
    dueDate: data.dueDate,
    locked: data.locked,
    employeeAssignments: data.employeeAssignments,
    items: data.items.map(item => ({
      uuid: item.uuid,
      productVariantId: item.productVariantId,
      inventoryItemId: item.inventoryItemId,
      countQuantity: item.countQuantity,
      productTitle: item.productTitle,
      productVariantTitle: item.productVariantTitle,
    })),
  };
};

export const useCycleCountMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<CreateCycleCountResponse, unknown, CreateCycleCount, unknown>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (body: CreateCycleCount) => {
      const cleanedBody = cleanCreateCycleCount(body);
      const response = await fetch('/api/cycle-count', {
        method: 'POST',
        body: JSON.stringify(cleanedBody),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to mutate cycle count');
      }

      const result: CreateCycleCountResponse = await response.json();
      return result;
    },
    onSuccess: (...args) => {
      const [result] = args;
      queryClient.invalidateQueries({ queryKey: ['inventory-item'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['cycle-count-page'] });
      queryClient.setQueryData(['cycle-count', result.name], result satisfies UseQueryData<typeof useCycleCountQuery>);

      options?.onSuccess?.(...args);
    },
  });
};
