import { z } from 'zod';
import { zGid, zMoney } from '../util/zod.js';

const Base = z.object({
  productVariantId: zGid.optional(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  sku: z.string().min(1),
  price: zMoney,
});

export const UpsertService = z.discriminatedUnion('type', [
  Base.extend({
    type: z.literal('dynamic'),
    defaultCharges: z
      .string()
      .optional()
      .transform(value => value?.split(',') ?? [])
      .pipe(z.array(zGid)),
  }),
  Base.extend({
    type: z.literal('fixed'),
  }),
]);

export type UpsertService = z.infer<typeof UpsertService>;
