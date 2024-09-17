import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import type { CreateWorkOrderResponse } from '@web/controllers/api/work-order.js';
import { Fetch } from './fetch.js';
import { Nullable } from '../types/Nullable.js';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { string } from '@teifi-digital/shopify-app-toolbox';
import { UseQueryData } from './react-query.js';
import { useWorkOrderQuery } from './use-work-order-query.js';

export const useSaveWorkOrderMutation = (
  { fetch }: { fetch: Fetch },
  options?: UseMutationOptions<CreateWorkOrderResponse, SaveWorkOrderValidationErrors, Nullable<CreateWorkOrder>>,
) => {
  const queryClient = useQueryClient();

  return useMutation<CreateWorkOrderResponse, SaveWorkOrderValidationErrors, Nullable<CreateWorkOrder>>({
    ...options,
    mutationFn: async (createWorkOrder: Nullable<CreateWorkOrder>) => {
      validateWorkOrder(createWorkOrder);

      const response = await fetch('/api/work-order', {
        method: 'POST',
        body: JSON.stringify(createWorkOrder),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(await response.text());

      const workOrder: CreateWorkOrderResponse = await response.json();
      return workOrder;
    },
    onSuccess(...args) {
      const [workOrder] = args;

      queryClient.setQueryData(['work-order', workOrder.name], { workOrder } satisfies UseQueryData<
        typeof useWorkOrderQuery
      >);

      queryClient.invalidateQueries({ queryKey: ['work-order-info'] });

      if (workOrder.serial) {
        queryClient.invalidateQueries({ queryKey: ['serials'] });
        queryClient.invalidateQueries({
          queryKey: ['serial', workOrder.serial.productVariantId, workOrder.serial.serial],
        });
      }

      options?.onSuccess?.(...args);
    },
  });
};

function validateWorkOrder(createWorkOrder: Nullable<CreateWorkOrder>): asserts createWorkOrder is CreateWorkOrder {
  const errors: Partial<Record<keyof CreateWorkOrder, string>> = {};

  const requiredKeys: (keyof CreateWorkOrder)[] = [
    'status',
    'customerId',
    'dueDate',
    'charges',
    'note',
    'items',
    'customFields',
  ];

  if (createWorkOrder.companyId !== null) {
    requiredKeys.push('companyLocationId', 'companyContactId');
  }

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
    throw new SaveWorkOrderValidationErrors(errors);
  }
}

export class SaveWorkOrderValidationErrors extends Error {
  constructor(
    public readonly errors: {
      [key in keyof CreateWorkOrder]?: string;
    },
  ) {
    const invalid = Object.keys(errors).map(key => string.titleCase(key));

    super(`Invalid values for ${invalid.join(', ')}`);
  }
}
