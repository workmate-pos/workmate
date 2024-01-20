import { StringAttribute } from '../StringAttribute.js';

/**
 * Attribute containing a uuid.
 * Used for adding UUIDs to Work Order line items in Draft Orders ({@link UuidsAttribute} is used for POS).
 */
export const UuidAttribute = new StringAttribute('_UUID');
