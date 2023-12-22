import { CustomAttribute } from '../CustomAttribute.js';
import { z } from 'zod';

const schema = z.literal(true);

/**
 * Indicates that a line item is labour costs. Can be used to filter out labour line items (e.g. in the POS app it should not be shown directly).
 */
export const LabourLineItemAttribute = new CustomAttribute('_labour_item', schema, v => v);
