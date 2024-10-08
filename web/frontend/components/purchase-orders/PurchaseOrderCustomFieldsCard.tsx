import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';
import { CustomFieldsCard } from '@web/frontend/components/shared-orders/CustomFieldsCard.js';

export function PurchaseOrderCustomFieldsCard({
  createPurchaseOrder,
  dispatch,
  disabled,
  onSavePresetClick,
  onAddCustomFieldClick,
  onPresetsClick,
  onFieldValuesClick,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  dispatch: CreatePurchaseOrderDispatchProxy;
  disabled: boolean;
  onSavePresetClick: () => void;
  onAddCustomFieldClick: () => void;
  onPresetsClick: () => void;
  onFieldValuesClick: () => void;
}) {
  return (
    <CustomFieldsCard
      kind="purchase-order"
      customFields={createPurchaseOrder.customFields}
      onUpdate={(customFields: Record<string, string>) => dispatch.setPartial({ customFields })}
      disabled={disabled}
      onSavePresetClick={onSavePresetClick}
      onAddCustomFieldClick={onAddCustomFieldClick}
      onPresetsClick={onPresetsClick}
      onFieldValuesClick={onFieldValuesClick}
    />
  );
}
