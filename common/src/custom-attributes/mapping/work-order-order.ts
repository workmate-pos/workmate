import { WorkOrderAttribute } from '../attributes/WorkOrderAttribute.js';
import { AttributeMapping } from './index.js';
import { CustomAttributeValue } from '../CustomAttribute.js';

/**
 * Attributes that should be set on a work order.
 * This type is used to enforce that all attributes are set on the backend and pos.
 */
export type WorkOrderOrderAttributes = {
  workOrder: CustomAttributeValue<typeof WorkOrderAttribute>;
};

export const WorkOrderOrderAttributesMapping: AttributeMapping<WorkOrderOrderAttributes> = {
  workOrder: WorkOrderAttribute,
};
