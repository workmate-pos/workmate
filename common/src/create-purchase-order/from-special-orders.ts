import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { DetailedSpecialOrder } from '@web/services/special-orders/types.js';
import { Location } from '../queries/use-locations-query.js';
import { ProductVariant } from '../queries/use-product-variants-query.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sum } from '@teifi-digital/shopify-app-toolbox/array';
import { uuid } from '../util/uuid.js';

export function getCreatePurchaseOrderForSpecialOrders({
  location,
  vendorName,
  status,
  purchaseOrderCustomFields,
  lineItemCustomFields,
  productVariants,
  specialOrders,
}: {
  location: Location;
  vendorName: string;
  status: string;
  purchaseOrderCustomFields: Record<string, string>;
  lineItemCustomFields: Record<string, string>;
  productVariants: Record<ID, ProductVariant>;
  specialOrders: DetailedSpecialOrder[];
}): CreatePurchaseOrder {
  // TODO: Filter out line items that are already ordered
  return {
    name: null,
    type: 'NORMAL',
    status,
    placedDate: null,
    locationId: location.id,
    vendorName,
    shipFrom: '',
    shipTo: location?.address?.formatted.join('\n') ?? '',
    note: '',
    discount: null,
    tax: null,
    shipping: null,
    deposited: null,
    paid: null,
    customFields: purchaseOrderCustomFields,
    employeeAssignments: [],
    lineItems: specialOrders.flatMap(specialOrder =>
      specialOrder.lineItems
        .map(lineItem => {
          const productVariant = productVariants[lineItem.productVariantId];

          if (!productVariant) {
            throw new Error('Product variant not found');
          }

          if (productVariant.product.vendor !== vendorName) {
            return null;
          }

          const inventoryItem = productVariant.inventoryItem;

          const unitCost = inventoryItem.unitCost
            ? BigDecimal.fromDecimal(inventoryItem.unitCost.amount).toMoney()
            : BigDecimal.ZERO.toMoney();

          const remainingQuantity =
            lineItem.quantity - sum(lineItem.purchaseOrderLineItems.map(lineItem => lineItem.quantity));

          if (remainingQuantity <= 0) {
            return null;
          }

          return {
            uuid: uuid(),
            productVariantId: lineItem.productVariantId,
            specialOrderLineItem: {
              name: specialOrder.name,
              uuid: lineItem.uuid,
            },
            quantity: remainingQuantity,
            unitCost,
            customFields: lineItemCustomFields,
            serialNumber: null,
          } satisfies CreatePurchaseOrder['lineItems'][number];
        })
        .filter(isNonNullable),
    ),
  };
}
