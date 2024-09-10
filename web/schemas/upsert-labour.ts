import { z } from 'zod';
import { zQsBool, zDecimal, zGid, zMoney } from '../util/zod.js';

const Base = z.object({
  metaobjectId: zGid.optional(),
  name: z.string().min(1),
  removable: zQsBool,
});

export const UpsertLabour = z.discriminatedUnion('type', [
  Base.extend({
    type: z.literal('hourly'),
    rate: zMoney,
    hours: zDecimal,
    customizeRate: zQsBool,
    customizeHours: zQsBool,
  }),
  Base.extend({
    type: z.literal('fixed'),
    amount: zMoney,
    customizeAmount: zQsBool,
  }),
]);

export type UpsertLabour = z.infer<typeof UpsertLabour>;
