import { useMutation, useQueryClient } from 'react-query';
import type { WorkOrder } from '../screens/WorkOrder';
import type { CreateWorkOrder } from '../schemas/generated/create-work-order';
import { toCents } from '../util/money-utils';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';

export type WorkOrderValidationErrors = {
  [key in keyof WorkOrder]?: string;
};

export const useSaveWorkOrderMutation = () => {
  const fetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, string | Error | WorkOrderValidationErrors, Partial<WorkOrder>>(
    async workOrder => {
      validateWorkOrder(workOrder);

      const createWorkOrder: CreateWorkOrder = {
        name: workOrder.name,
        status: workOrder.status,
        customer: {
          id: workOrder.customer.id,
        },
        price: {
          deposit: toCents(workOrder.price.deposit),
          tax: toCents(workOrder.price.tax),
          discount: toCents(workOrder.price.discount),
          shipping: toCents(workOrder.price.shipping),
        },
        dueDate: workOrder.dueDate.toISOString(),
        products: workOrder.products.map(item => ({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice: toCents(item.unitPrice),
        })),
        employeeAssignments: workOrder.employeeAssignments.map(employee => ({
          employeeId: employee.employeeId,
        })),
        description: workOrder.description,
      };

      const response = await fetch('/api/work-order', {
        body: JSON.stringify(createWorkOrder),
      });

      if (!response.ok) {
        throw 'Something went wrong while saving this work order';
      }

      return await response.json();
    },
    {
      onSuccess(data, workOrder) {
        if (workOrder.name) {
          queryClient.invalidateQueries(['work-order', workOrder.name]);
        }
      },
    },
  );
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
