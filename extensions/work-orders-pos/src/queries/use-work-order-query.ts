import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useQuery, UseQueryOptions } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { WorkOrder } from '../screens/WorkOrder';
import type { FetchWorkOrderResponse } from '@web/controllers/api/work-order';

export const useWorkOrderQuery = (
  name: string | null,
  options?: UseQueryOptions<Partial<WorkOrder> | null, unknown, Partial<WorkOrder> | null, (string | null)[]>,
) => {
  const fetch = useAuthenticatedFetch();
  const api = useExtensionApi<'pos.home.modal.render'>();

  return useQuery({
    ...options,
    queryKey: ['work-order', name],
    queryFn: async () => {
      if (!name) return null;

      const response = await fetch(`/api/work-order/${encodeURIComponent(name)}`);

      if (!response.ok) {
        throw new Error(`useWorkOrderQuery HTTP Status ${response.status}`);
      }

      const { workOrder, payments, employees, customer, products } = (await response.json()) as FetchWorkOrderResponse;

      const productVariantIds = products.map(p => Number(p.productVariantId));

      const productVariantBatchSize = 50;
      const productVariants = await Promise.all(
        Array.from({ length: Math.ceil(productVariantIds.length / productVariantBatchSize) }, (_, i) => {
          const batch = productVariantIds.slice(productVariantBatchSize * i, productVariantBatchSize * (i + 1));
          return api.productSearch.fetchProductVariantsWithIds(batch).then(result => result.fetchedResources);
        }),
      ).then(array => array.flat());

      const productVariantMap = Object.fromEntries(productVariants.map(p => [p.id, p]));

      const result: Partial<WorkOrder> = {
        name: workOrder.name,
        status: workOrder.status,
        price: {
          discount: workOrder.discountAmount / 100,
          tax: workOrder.taxAmount / 100,
          shipping: workOrder.shippingAmount / 100,
        },
        dueDate: workOrder.dueDate,
        description: workOrder.description,
        employeeAssignments: employees.map(({ id, name }) => ({
          name,
          employeeId: id,
        })),
        customer: customer ? { id: customer.id, name: customer.displayName } : undefined,
        products: products.map(({ productVariantId, unitPrice, quantity }) => ({
          productVariantId: productVariantId,
          unitPrice: unitPrice / 100,
          quantity: quantity,
          name: productVariantMap[productVariantId]?.displayName ?? 'Unknown product',
          sku: productVariantMap[productVariantId]?.sku ?? '',
          imageUrl:
            productVariantMap[productVariantId]?.image ?? productVariantMap[productVariantId]?.product?.featuredImage,
        })),
        payments: payments.map(({ type, amount }) => ({
          type,
          amount: amount / 100,
        })),
      };

      return result;
    },
  });
};

export type { PaymentType } from '@web/services/db/queries/generated/work-order-payment.sql';
