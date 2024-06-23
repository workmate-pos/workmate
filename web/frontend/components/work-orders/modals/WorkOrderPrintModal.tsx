import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { PrintModal } from '@web/frontend/components/shared-orders/modals/PrintModal.js';
import { WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';

export function WorkOrderPrintModal({
  createWorkOrder,
  open,
  onClose,
  setToastAction,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
}) {
  return (
    <PrintModal
      name={createWorkOrder.name}
      open={open}
      onClose={onClose}
      setToastAction={setToastAction}
      type="work-order"
      dueDateUtc={new Date(createWorkOrder.dueDate)}
    />
  );
}
