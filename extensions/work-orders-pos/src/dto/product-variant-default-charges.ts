import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { uuid } from '../util/uuid.js';
import { CreateWorkOrderCharge } from '../screens/routes.js';

export function productVariantDefaultChargeToCreateWorkOrderCharge(
  charge: ProductVariant['defaultCharges'][number],
  lineItemUuid: string,
): CreateWorkOrderCharge {
  switch (charge.type) {
    case 'fixed-price-labour-charge': {
      return {
        type: 'fixed-price-labour',
        chargeUuid: uuid(),
        name: charge.name,
        amount: charge.amount,
        employeeId: null,
        lineItemUuid,
      };
    }

    case 'hourly-labour-charge': {
      return {
        type: 'hourly-labour',
        chargeUuid: uuid(),
        name: charge.name,
        rate: charge.rate,
        hours: charge.hours,
        employeeId: null,
        lineItemUuid,
      };
    }

    default:
      return charge satisfies never;
  }
}
