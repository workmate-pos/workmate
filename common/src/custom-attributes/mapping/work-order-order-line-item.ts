import { LabourLineItemUuidAttribute } from '../attributes/LabourLineItemUuidAttribute.js';
import { PlaceholderLineItemAttribute } from '../attributes/PlaceholderLineItemAttribute.js';
import { AttributeMapping } from './index.js';
import { CustomAttributeValue } from '../CustomAttribute.js';
import { SkuAttribute } from '../attributes/SkuAttribute.js';
import { UuidAttribute } from '../attributes/UuidAttribute.js';
import { UuidsAttribute } from '../attributes/UuidsAttribute.js';

/**
 * Attributes that should be set on a line item.
 * This type is used to enforce that all attributes are set on the backend and pos.
 */
export type WorkOrderOrderLineItemAttributes = {
  placeholderLineItem: CustomAttributeValue<typeof PlaceholderLineItemAttribute> | null;
  labourLineItemUuid: CustomAttributeValue<typeof LabourLineItemUuidAttribute> | null;
  sku: CustomAttributeValue<typeof SkuAttribute> | null;
  uuid: CustomAttributeValue<typeof UuidAttribute> | null;
  uuids: CustomAttributeValue<typeof UuidsAttribute> | null;
};

export const WorkOrderOrderLineItemAttributesMapping: AttributeMapping<WorkOrderOrderLineItemAttributes> = {
  placeholderLineItem: PlaceholderLineItemAttribute,
  labourLineItemUuid: LabourLineItemUuidAttribute,
  sku: SkuAttribute,
  uuid: UuidAttribute,
  uuids: UuidsAttribute,
};
