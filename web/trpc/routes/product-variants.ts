import { authenticatedProcedure, router } from '../trpc.js';
import { zObjectGid } from '../../util/zod.js';
import { z } from 'zod';
import { CachedProductVariant, getProductVariant } from '../../services/shopify-objects/objects/product-variant.js';

export const productVariants = router({
  getById: authenticatedProcedure
    .input(zObjectGid('ProductVariant'))
    .output(CachedProductVariant.or(z.null()))
    .query(({ input: id, ctx: { session } }) => getProductVariant({ session, id })),

  getByBarcode: authenticatedProcedure.input(z.string().min(1)).query(async ({ input: barcode, ctx: { session } }) => {
    // TODO: Make this its own cached resource that only stores the product variant id.
    // TODO: ^-> we query by barcode but also fetch full variants and instantly update the variant cache
    // TODO: Barcodes can have multiple variants for some reason :/
  }),

  getPage: authenticatedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(25),
        cursor: z.string().optional(),
        query: z.string().optional(),
      }),
    )
    .query(async ({ input: { limit, cursor, query }, ctx: { session } }) => {
      // TODO: fetch IDs from graphql API, then fetch cached product variant ids
    }),
});
