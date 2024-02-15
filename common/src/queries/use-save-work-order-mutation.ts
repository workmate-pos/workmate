import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import type { CreateWorkOrderResponse } from '@web/controllers/api/work-order.js';
import { Fetch } from './fetch.js';
import { Nullable } from '../types/Nullable.js';

export type CreateWorkOrderValidationErrors = {
  [key in keyof CreateWorkOrder]?: string;
};

export const useSaveWorkOrderMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<
    { name?: string; errors?: CreateWorkOrderValidationErrors },
    unknown,
    Nullable<CreateWorkOrder>,
    unknown
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (nullableCreateWorkOrder: Nullable<CreateWorkOrder>) => {
      const validation = validateWorkOrder(nullableCreateWorkOrder);

      if (validation.type === 'error') {
        return { errors: validation.errors };
      }

      const { createWorkOrder } = validation;

      const response = await fetch('/api/work-order', {
        method: 'POST',
        body: JSON.stringify(createWorkOrder),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(await response.text());

      const result: CreateWorkOrderResponse = await response.json();
      return result;
    },
    onSuccess(...args) {
      const [, { name }] = args;
      if (name) {
        queryClient.invalidateQueries(['work-order', name]);
      }

      queryClient.invalidateQueries(['work-order-info']);

      options?.onSuccess?.(...args);
    },
  });
};

function validateWorkOrder(createWorkOrder: Nullable<CreateWorkOrder>):
  | {
      type: 'error';
      errors: CreateWorkOrderValidationErrors;
    }
  | {
      type: 'success';
      createWorkOrder: CreateWorkOrder;
    } {
  const errors: CreateWorkOrderValidationErrors = {};

  const requiredKeys: (keyof CreateWorkOrder)[] = [
    'status',
    'customerId',
    'dueDate',
    'charges',
    'description',
    'lineItems',
  ];

  for (const key of requiredKeys) {
    if (createWorkOrder[key] === null || createWorkOrder[key] === undefined) {
      errors[key] = 'This field is required';
    }
  }

  if (Object.keys(errors).length) {
    return {
      type: 'error',
      errors,
    };
  }

  return {
    type: 'success',
    createWorkOrder: createWorkOrder as CreateWorkOrder,
  };
}
