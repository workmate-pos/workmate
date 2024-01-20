import { JsonAttribute } from '../JsonAttribute.js';
import { z } from 'zod';

const schema = z.literal(true);

/**
 * Indicates that a line item is a placeholder.
 * These are sometimes required because Draft Orders are not allowed to be empty.
 */
export const PlaceholderLineItemAttribute = new JsonAttribute('_Is Placeholder', schema, v => v);
