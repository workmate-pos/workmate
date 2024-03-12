import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { uuid } from '../util/uuid.js';
import { CreateWorkOrderCharge } from '../types.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';

export function productVariantDefaultChargeToCreateWorkOrderCharge(
  charge: ProductVariant['defaultCharges'][number],
): DiscriminatedUnionOmit<CreateWorkOrderCharge, 'workOrderItemUuid' | 'uuid'> {
  switch (charge.type) {
    case 'fixed-price-labour-charge': {
      return {
        type: 'fixed-price-labour',
        name: charge.name,
        amount: charge.amount,
        employeeId: null,
      };
    }

    case 'hourly-labour-charge': {
      return {
        type: 'hourly-labour',
        name: charge.name,
        rate: charge.rate,
        hours: charge.hours,
        employeeId: null,
      };
    }

    default:
      return charge satisfies never;
  }
}
