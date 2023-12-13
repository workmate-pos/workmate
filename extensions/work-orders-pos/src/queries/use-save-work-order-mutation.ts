import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import type { WorkOrder } from '../types/work-order';
import type { CreateWorkOrder } from '@web/schemas/generated/create-work-order';
import { toCents } from '@common/util/money';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { CreateWorkOrderResponse } from '@web/controllers/api/work-order';

export type WorkOrderValidationErrors = {
  [key in keyof WorkOrder]?: string;
};

export const useSaveWorkOrderMutation = (
  options: UseMutationOptions<CreateWorkOrderResponse, string | Error | WorkOrderValidationErrors, Partial<WorkOrder>>,
) => {
  const fetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const api = useExtensionApi<'pos.home.modal.render'>();

  return useMutation<CreateWorkOrderResponse, string | Error | WorkOrderValidationErrors, Partial<WorkOrder>>({
    ...options,
    mutationFn: async workOrder => {
      validateWorkOrder(workOrder);

      const createWorkOrder: CreateWorkOrder = {
        name: workOrder.name,
        status: workOrder.status,
        customer: {
          id: workOrder.customer.id,
        },
        price: {
          tax: toCents(workOrder.price.tax),
          discount: toCents(workOrder.price.discount),
          shipping: toCents(workOrder.price.shipping),
        },
        dueDate: workOrder.dueDate,
        products: workOrder.products.map(({ productVariantId, quantity, unitPrice }) => ({
          productVariantId,
          quantity,
          unitPrice: toCents(unitPrice),
        })),
        employeeAssignments: workOrder.employeeAssignments.map(({ employeeId }) => ({ employeeId })),
        description: workOrder.description,
        services: workOrder.services.map(({ productVariantId, employeeAssignments, basePrice }) => ({
          productVariantId,
          employeeAssignments: employeeAssignments.map(({ employeeId, employeeRate, hours }) => ({
            employeeId,
            hours,
            employeeRate: toCents(employeeRate),
          })),
          basePrice: toCents(basePrice),
        })),
        derivedFromOrderId: workOrder.derivedFromOrder?.id,
      };

      const response = await fetch('/api/work-order', {
        body: JSON.stringify(createWorkOrder),
      });

      if (!response.ok) {
        throw 'Something went wrong while saving this work order';
      }

      return await response.json();
    },
    async onSuccess(...args) {
      const [{ workOrder }] = args;

      if (workOrder.name) {
        queryClient.invalidateQueries(['work-order', workOrder.name]);
      }

      queryClient.invalidateQueries(['work-order-info']);

      options.onSuccess?.(...args);
    },
    onMutate(...args) {
      api.toast.show('Saving work order');

      options.onMutate?.(...args);
    },
  });
};

function validateWorkOrder(workOrder: Partial<WorkOrder>): asserts workOrder is WorkOrder {
  const errors: WorkOrderValidationErrors = {};

  const requiredKeys: (keyof WorkOrder)[] = [
    'status',
    'customer',
    'price',
    'dueDate',
    'products',
    'employeeAssignments',
    'description',
  ];

  for (const key of requiredKeys) {
    if (workOrder[key] === undefined) {
      errors[key] = 'This field is required';
    }
  }

  if (Object.keys(errors).length) {
    throw errors;
  }
}
