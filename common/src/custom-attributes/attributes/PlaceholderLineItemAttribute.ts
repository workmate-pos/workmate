import { CustomAttribute } from '../CustomAttribute.js';
import { z } from 'zod';

const schema = z.literal(true);

/**
 * Indicates that a line item is a placeholder.
 * These are sometimes required because Draft Orders are not allowed to be empty.
 */
export const PlaceholderLineItemAttribute = new CustomAttribute('_placeholder_item', schema, v => v);
