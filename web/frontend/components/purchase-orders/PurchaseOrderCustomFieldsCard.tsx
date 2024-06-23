import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import { CustomFieldsCard } from '@web/frontend/components/shared-orders/CustomFieldsCard.js';

export function PurchaseOrderCustomFieldsCard({
  createPurchaseOrder,
  dispatch,
  disabled,
  onImportPresetClick,
  onSavePresetClick,
  onAddCustomFieldClick,
  onEditPresetClick,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
  onImportPresetClick: () => void;
  onSavePresetClick: () => void;
  onAddCustomFieldClick: () => void;
  onEditPresetClick: () => void;
}) {
  return (
    <CustomFieldsCard
      customFields={createPurchaseOrder.customFields}
      onUpdate={(customFields: Record<string, string>) => dispatch.setPartial({ customFields })}
      disabled={disabled}
      onImportPresetClick={onImportPresetClick}
      onSavePresetClick={onSavePresetClick}
      onEditPresetClick={onEditPresetClick}
      onAddCustomFieldClick={onAddCustomFieldClick}
    />
  );
}
