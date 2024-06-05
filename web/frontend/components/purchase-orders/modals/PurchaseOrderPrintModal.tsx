import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { PrintModal } from '@web/frontend/components/shared-orders/modals/PrintModal.js';

export function PurchaseOrderPrintModal({
  createPurchaseOrder,
  open,
  onClose,
  setToastAction,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
}) {
  return (
    <PrintModal
      name={createPurchaseOrder.name}
      open={open}
      onClose={onClose}
      setToastAction={setToastAction}
      type="purchase-order"
    />
  );
}
