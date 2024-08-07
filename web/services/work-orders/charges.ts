import { z } from 'zod';
import { zDecimal, zID, zMoney } from '../../util/zod.js';

export type WorkOrderChargeData = z.infer<typeof WorkOrderChargeData>;

export const WorkOrderChargeData = z
  .object({
    employeeId: zID.nullable(),
    name: z.string().min(1),
    removeLocked: z.boolean().describe('If true, this charge can only be removed by admins'),
  })
  .and(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('fixed-price-labour'),
        amount: zMoney,
        amountLocked: z.boolean(),
      }),
      z.object({
        type: z.literal('hourly-labour'),
        rate: zMoney,
        hours: zDecimal,
        rateLocked: z.boolean(),
        hoursLocked: z.boolean(),
      }),
    ]),
  );
