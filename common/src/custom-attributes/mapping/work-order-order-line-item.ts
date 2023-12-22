import { CustomAttributeValue } from '../CustomAttribute.js';
import { LabourLineItemAttribute } from '../attributes/LabourLineItemAttribute.js';
import { PlaceholderLineItemAttribute } from '../attributes/PlaceholderLineItemAttribute.js';
import { AttributeMapping } from './index.js';

/**
 * Attributes that should be set on a line item.
 * This type is used to enforce that all attributes are set on the backend and pos.
 */
export type WorkOrderOrderLineItemAttributes = {
  labourLineItem: CustomAttributeValue<typeof LabourLineItemAttribute> | null;
  placeholderLineItem: CustomAttributeValue<typeof PlaceholderLineItemAttribute> | null;
};

export const WorkOrderOrderLineItemAttributesMapping: AttributeMapping<WorkOrderOrderLineItemAttributes> = {
  placeholderLineItem: PlaceholderLineItemAttribute,
  labourLineItem: LabourLineItemAttribute,
};
