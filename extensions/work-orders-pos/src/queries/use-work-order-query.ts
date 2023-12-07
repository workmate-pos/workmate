import { useQuery, UseQueryOptions } from 'react-query';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { WorkOrder } from '../types/work-order';
import type { FetchWorkOrderResponse } from '@web/controllers/api/work-order';
import { toDollars } from '../util/money-utils';
import { uuid } from '../util/uuid';
import { useProductVariantFetcher } from '../hooks/use-product-variant-fetcher';
import { parseGid } from '../util/gid';

export const useWorkOrderQuery = (
  name: string | null,
  options?: UseQueryOptions<Partial<WorkOrder> | null, unknown, Partial<WorkOrder> | null, (string | null)[]>,
) => {
  const fetch = useAuthenticatedFetch();
  const fetchProductVariants = useProductVariantFetcher();

  return useQuery({
    ...options,
    queryKey: ['work-order', name],
    queryFn: async () => {
      if (!name) return null;

      const response = await fetch(`/api/work-order/${encodeURIComponent(name)}`);

      if (!response.ok) {
        throw new Error(`useWorkOrderQuery HTTP Status ${response.status}`);
      }

      const { workOrder, payments, services, employees, customer, products, derivedFromOrder }: FetchWorkOrderResponse =
        await response.json();

      const productVariantIds = [...products, ...services].map(s => Number(parseGid(s.productVariantId).id));
      const productVariantRecord = await fetchProductVariants(productVariantIds);

      const result: Partial<WorkOrder> = {
        name: workOrder.name,
        status: workOrder.status,
        price: {
          discount: toDollars(workOrder.discountAmount),
          tax: toDollars(workOrder.taxAmount),
          shipping: toDollars(workOrder.shippingAmount),
        },
        dueDate: workOrder.dueDate,
        description: workOrder.description,
        employeeAssignments: employees.map(({ id: employeeId, name }) => ({ name, employeeId })),
        customer: { id: customer.id, name: customer.displayName },
        products: products.map(({ productVariantId, unitPrice, quantity }) => {
          const productVariant = productVariantRecord[parseGid(productVariantId).id];
          const displayName = productVariant
            ? productVariant?.product?.hasOnlyDefaultVariant
              ? productVariant?.product?.title
              : `${productVariant?.product?.title} - ${productVariant?.title}`
            : 'Unknown product';

          return {
            productVariantId: productVariantId,
            unitPrice: toDollars(unitPrice),
            quantity: quantity,
            name: displayName,
            sku: productVariant?.sku ?? '',
            imageUrl: productVariant?.image ?? productVariant?.product?.featuredImage,
          };
        }),
        payments: payments.map(({ type, amount }) => ({
          type,
          amount: toDollars(amount),
        })),
        services: services.map(({ productVariantId, employeeAssignments, basePrice }) => {
          const productVariant = productVariantRecord[parseGid(productVariantId).id];
          const displayName = productVariant
            ? productVariant?.product?.hasOnlyDefaultVariant
              ? productVariant?.product?.title
              : `${productVariant?.product?.title} - ${productVariant?.title}`
            : 'Unknown service';

          return {
            uuid: uuid(),
            productVariantId,
            basePrice: toDollars(basePrice),
            name: displayName,
            sku: productVariant?.sku ?? '',
            employeeAssignments: employeeAssignments.map(({ name, id, hours, employeeRate }) => ({
              name,
              hours,
              employeeId: id,
              employeeRate: toDollars(employeeRate),
            })),
          };
        }),
        derivedFromOrder,
      };

      return result;
    },
  });
};

export type { PaymentType } from '@web/services/db/queries/generated/work-order-payment.sql';
