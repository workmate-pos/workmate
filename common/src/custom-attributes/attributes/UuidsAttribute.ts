import { z } from 'zod';
import { JsonAttribute } from '../JsonAttribute.js';

const schema = z.string().array();

/**
 * Attribute containing a JSON list of uuids.
 * Used for adding UUIDs to Work Order line items in POS.
 * List version of {@link UuidAttribute} because POS does not support multiple line items for the same product variant.
 */
export const UuidsAttribute = new JsonAttribute('_UUIDS', schema, v => v);
