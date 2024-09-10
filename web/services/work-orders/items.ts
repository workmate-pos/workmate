import { z } from 'zod';
import { zGid, zMoney } from '../../util/zod.js';

export type WorkOrderItemData = z.infer<typeof WorkOrderItemData>;

export const WorkOrderItemData = z
  .object({
    absorbCharges: z
      .boolean()
      .describe(
        'Whether charges connected to this item should be included in the line item create for this item.' +
          ' If true, the quantity of this item will be ignored, and will be set such that it covers the price of all charges.',
      ),
    quantity: z.number().min(1),
  })
  .and(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('product'),
        productVariantId: zGid,
      }),
      z.object({
        type: z.literal('custom-item'),
        name: z.string().min(1),
        unitPrice: zMoney,
      }),
    ]),
  );
