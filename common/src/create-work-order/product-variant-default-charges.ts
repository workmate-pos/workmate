import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { ProductVariant } from '../queries/use-product-variants-query.js';
import { DiscriminatedUnionOmit } from '../types/DiscriminatedUnionOmit.js';

export function productVariantDefaultChargeToCreateWorkOrderCharge(
  charge: ProductVariant['defaultCharges'][number],
): DiscriminatedUnionOmit<CreateWorkOrder['charges'][number], 'workOrderItemUuid' | 'uuid'> {
  switch (charge.type) {
    case 'fixed-price-labour-charge': {
      return {
        type: 'fixed-price-labour',
        name: charge.name,
        amount: charge.amount,
        employeeId: null,
        amountLocked: !charge.customizeAmount,
        removeLocked: !charge.removable,
      };
    }

    case 'hourly-labour-charge': {
      return {
        type: 'hourly-labour',
        name: charge.name,
        rate: charge.rate,
        hours: charge.hours,
        employeeId: null,
        rateLocked: !charge.customizeRate,
        hoursLocked: !charge.customizeHours,
        removeLocked: !charge.removable,
      };
    }

    default:
      return charge satisfies never;
  }
}
