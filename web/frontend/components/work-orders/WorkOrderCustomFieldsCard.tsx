import { CustomFieldsCard } from '@web/frontend/components/shared-orders/CustomFieldsCard.js';
import { CreateWorkOrderDispatchProxy, WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';

export function WorkOrderCustomFieldsCard({
  createWorkOrder,
  dispatch,
  disabled,
  onImportPresetClick,
  onSavePresetClick,
  onEditPresetClick,
  onAddCustomFieldClick,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  dispatch: CreateWorkOrderDispatchProxy;
  disabled: boolean;
  onImportPresetClick: () => void;
  onSavePresetClick: () => void;
  onAddCustomFieldClick: () => void;
  onEditPresetClick: () => void;
}) {
  return (
    <CustomFieldsCard
      customFields={createWorkOrder.customFields}
      onUpdate={(customFields: Record<string, string>) => dispatch.setPartial({ customFields })}
      disabled={disabled}
      onImportPresetClick={onImportPresetClick}
      onSavePresetClick={onSavePresetClick}
      onEditPresetClick={onEditPresetClick}
      onAddCustomFieldClick={onAddCustomFieldClick}
    />
  );
}
