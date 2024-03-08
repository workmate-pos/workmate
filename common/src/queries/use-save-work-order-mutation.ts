import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import type { CreateWorkOrderResponse } from '@web/controllers/api/work-order.js';
import { Fetch } from './fetch.js';
import { Nullable } from '../types/Nullable.js';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';

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

  const requiredKeys: (keyof CreateWorkOrder)[] = ['status', 'customerId', 'dueDate', 'charges', 'note', 'items'];

  for (const key of requiredKeys) {
    if (createWorkOrder[key] === null) {
      errors[key] = 'This field is required';
    }
  }

  for (const [key, value] of entries(createWorkOrder)) {
    if (value === undefined) {
      errors[key] ??= 'This field is required';
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
