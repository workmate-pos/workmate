import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import { WorkOrder } from '../screens/WorkOrder';
import { useExtensionApi } from '@shopify/retail-ui-extensions-react';

export const useWorkOrderFetcher = () => {
  const fetch = useAuthenticatedFetch();
  const api = useExtensionApi<'pos.home.modal.render'>();

  return async (name: string): Promise<Partial<WorkOrder> | null> => {
    const response = await fetch(`/api/work-order/${encodeURIComponent(name)}`);

    if (!response.ok) {
      const text = await response.text();
      console.error(text);
      return null;
    }

    const { workOrder } = (await response.json()) as { workOrder: ExistingWorkOrder };

    const productVariantIds = workOrder.products.map(p => Number(p.productId));

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
      employeeAssignments: workOrder.employeeAssignments.map(e => ({ name: e.name, employeeId: e.id })),
      customer: workOrder.customer,
      products: workOrder.products.map(p => ({
        productId: p.productId,
        unitPrice: p.unitPrice / 100,
        quantity: p.quantity,
        name: productVariantMap[p.productId]?.displayName ?? 'Unknown product',
        sku: productVariantMap[p.productId]?.sku ?? '',
      })),
    };
  };
};

// TODO: Have backend provide this type
type ExistingWorkOrder = {
  name: string;
  status: string;
  discountAmount: number;
  depositAmount: number;
  shippingAmount: number;
  taxAmount: number;
  dueDate: string;
  description: string;
  employeeAssignments: {
    id: string;
    name: string;
  }[];
  customer: {
    id: string;
    name: string;
  };
  products: {
    productId: string;
    unitPrice: number;
    quantity: number;
  }[];
};
