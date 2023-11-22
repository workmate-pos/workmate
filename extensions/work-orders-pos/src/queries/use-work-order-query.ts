import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { useQuery, UseQueryOptions } from 'react-query';
import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { WorkOrder } from '../screens/WorkOrder';

export const useWorkOrderQuery = (
  name: string | null,
  options?: UseQueryOptions<WorkOrderQueryResponse, unknown, WorkOrderQueryResponse>,
) => {
  const fetch = useAuthenticatedFetch();
  const api = useExtensionApi<'pos.home.modal.render'>();

  return useQuery<WorkOrderQueryResponse, unknown, WorkOrderQueryResponse>(
    ['work-order', name],
    async () => {
      if (!name) return null;

      const response = await fetch(`/api/work-order/${encodeURIComponent(name)}`);

      if (!response.ok) {
        throw new Error(`useWorkOrderQuery HTTP Status ${response.status}`);
      }

      const { workOrder, employees, customer, products } = (await response.json()) as FetchWorkOrderResponse;

      const productVariantIds = products.map(p => Number(p.productVariantId));

      const productVariantBatchSize = 50;
      const productVariants = await Promise.all(
        Array.from({ length: Math.ceil(productVariantIds.length / productVariantBatchSize) }, (_, i) => {
          const batch = productVariantIds.slice(productVariantBatchSize * i, productVariantBatchSize * (i + 1));
          return api.productSearch.fetchProductVariantsWithIds(batch).then(result => result.fetchedResources);
        }),
      ).then(array => array.flat());

      const productVariantMap = Object.fromEntries(productVariants.map(p => [p.id, p]));

      return {
        name: workOrder.name,
        status: workOrder.status,
        price: {
          discount: workOrder.discountAmount / 100,
          deposit: workOrder.depositAmount / 100,
          tax: workOrder.taxAmount / 100,
          shipping: workOrder.shippingAmount / 100,
        },
        dueDate: new Date(workOrder.dueDate),
        description: workOrder.description,
        employeeAssignments: employees.map(({ id, name }) => ({ name, employeeId: id })),
        customer: {
          id: customer.id,
          name: customer.displayName,
        },
        products: products.map(p => ({
          productVariantId: p.productVariantId,
          unitPrice: p.unitPrice / 100,
          quantity: p.quantity,
          name: productVariantMap[p.productVariantId]?.displayName ?? 'Unknown product',
          sku: productVariantMap[p.productVariantId]?.sku ?? '',
        })),
      };
    },
    options,
  );
};

type WorkOrderQueryResponse = Partial<WorkOrder> | null;

// TODO: Have backend provide this type
type FetchWorkOrderResponse = {
  workOrder: {
    name: string;
    status: string;
    discountAmount: number;
    depositAmount: number;
    shippingAmount: number;
    taxAmount: number;
    dueDate: string;
    description: string;
  };
  customer: {
    id: string;
    displayName: string;
    phone?: string | null;
    email?: string | null;
  };
  employees: {
    id: string;
    name: string;
  }[];
  products: {
    productVariantId: string;
    quantity: number;
    unitPrice: number;
  }[];
};
