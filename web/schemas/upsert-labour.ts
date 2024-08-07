import { z } from 'zod';
import { qsBool, zDecimal, zID, zMoney } from '../util/zod.js';

const Base = z.object({
  metaobjectId: zID.optional(),
  name: z.string().min(1),
  removable: qsBool,
});

export const UpsertLabour = z.discriminatedUnion('type', [
  Base.extend({
    type: z.literal('hourly'),
    rate: zMoney,
    hours: zDecimal,
    customizeRate: qsBool,
    customizeHours: qsBool,
  }),
  Base.extend({
    type: z.literal('fixed'),
    amount: zMoney,
    customizeAmount: qsBool,
  }),
]);

export type UpsertLabour = z.infer<typeof UpsertLabour>;
