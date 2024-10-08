import { CustomFieldsCard } from '@web/frontend/components/shared-orders/CustomFieldsCard.js';
import { CreateWorkOrderDispatchProxy, WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';

export function WorkOrderCustomFieldsCard({
  createWorkOrder,
  dispatch,
  disabled,
  onSavePresetClick,
  onAddCustomFieldClick,
  onPresetsClick,
  onFieldValuesClick,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  dispatch: CreateWorkOrderDispatchProxy;
  disabled: boolean;
  onSavePresetClick: () => void;
  onAddCustomFieldClick: () => void;
  onPresetsClick: () => void;
  onFieldValuesClick: () => void;
}) {
  return (
    <CustomFieldsCard
      kind="work-order"
      customFields={createWorkOrder.customFields}
      onUpdate={(customFields: Record<string, string>) => dispatch.setPartial({ customFields })}
      disabled={disabled}
      onPresetsClick={onPresetsClick}
      onSavePresetClick={onSavePresetClick}
      onAddCustomFieldClick={onAddCustomFieldClick}
      onFieldValuesClick={onFieldValuesClick}
    />
  );
}
