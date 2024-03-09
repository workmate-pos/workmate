import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { uuid } from '../util/uuid.js';
import { CreateWorkOrderCharge } from '../types.js';

export function productVariantDefaultChargeToCreateWorkOrderCharge(
  charge: ProductVariant['defaultCharges'][number],
  workOrderItemUuid: string,
): CreateWorkOrderCharge {
  switch (charge.type) {
    case 'fixed-price-labour-charge': {
      return {
        type: 'fixed-price-labour',
        uuid: uuid(),
        name: charge.name,
        amount: charge.amount,
        employeeId: null,
        workOrderItemUuid,
      };
    }

    case 'hourly-labour-charge': {
      return {
        type: 'hourly-labour',
        uuid: uuid(),
        name: charge.name,
        rate: charge.rate,
        hours: charge.hours,
        employeeId: null,
        workOrderItemUuid,
      };
    }

    default:
      return charge satisfies never;
  }
}
