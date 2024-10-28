import { Modal } from '@shopify/polaris';
import {
  UnsourcedItemList,
  UnsourcedWorkOrderItem,
} from '@web/frontend/components/work-orders/components/UnsourcedItemList.js';
import { useReserveLineItemsInventoryMutation } from '@work-orders/common/queries/use-reserve-line-items-inventory-mutation.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';

export function WorkOrderSourcingReserveModal({
  name,
  open,
  onClose,
}: {
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const workOrderQuery = useWorkOrderQuery({ fetch, name });
  const workOrder = workOrderQuery.data?.workOrder;

  const reserveLineItemsInventoryMutation = useReserveLineItemsInventoryMutation({ fetch });

  const [selected, setSelected] = useState<(UnsourcedWorkOrderItem & { quantity: number })[]>([]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Reserve"
        loading={workOrderQuery.isLoading}
        primaryAction={{
          content: 'Reserve',
          loading: reserveLineItemsInventoryMutation.isPending,
          disabled: !selected.length || !workOrder?.locationId,
          onAction: () => {
            if (!selected.length || !workOrder?.locationId) {
              return;
            }

            reserveLineItemsInventoryMutation.mutate(
              {
                reservations: selected.map(item => ({
                  locationId: workOrder.locationId!,
                  quantity: item.quantity,
                  lineItemId: item.shopifyOrderLineItem.id,
                })),
              },
              {
                onSuccess() {
                  setToastAction({ content: 'Reserved' });
                  onClose();
                },
              },
            );
          },
        }}
      >
        <UnsourcedItemList name={name} includeAvailable={false} max="available" onSelectionChange={setSelected} />
      </Modal>

      {toast}
    </>
  );
}
