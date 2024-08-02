import { z } from 'zod';
import { zID, zMoney } from '../util/zod.js';

const Base = z.object({
  productVariantId: zID.optional(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  sku: z.string().min(1),
});

export const UpsertService = z.discriminatedUnion('type', [
  Base.extend({
    type: z.literal('dynamic'),
    defaultCharges: z
      .string()
      .optional()
      .transform(value => value?.split(',') ?? [])
      .pipe(z.array(zID)),
  }),
  Base.extend({
    type: z.literal('fixed'),
    price: zMoney,
  }),
]);

export type UpsertService = z.infer<typeof UpsertService>;
