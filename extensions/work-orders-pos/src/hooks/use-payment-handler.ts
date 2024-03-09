import { useExtensionApi, useStatefulSubscribableCart } from '@shopify/retail-ui-extensions-react';
import { useEffect, useRef, useState } from 'react';
import { WorkOrderCharge, WorkOrderItem } from '@web/services/work-orders/types.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { SetLineItemPropertiesInput } from '@shopify/retail-ui-extensions';
import { getWorkOrderLineItems, getWorkOrderOrderCustomAttributes } from '@work-orders/work-order-shopify-order';

const useCartRef = () => {
  const { current, subscribe } = useStatefulSubscribableCart();

  const cartRef = useRef(current);

  useEffect(() => {
    const unsubscribe = subscribe(cart => {
      cartRef.current = cart;
    });

    return () => unsubscribe();
  }, []);

  return cartRef;
};

export type PaymentHandler = ReturnType<typeof usePaymentHandler>;

/**
 * Creates work order payments.
 */
export const usePaymentHandler = () => {
  const api = useExtensionApi<'pos.home.modal.render'>();
  const [isLoading, setIsLoading] = useState(false);

  const cartRef = useCartRef();

  const handlePayment = async ({
    workOrderName,
    items,
    charges,
    customerId,
  }: {
    workOrderName: string;
    items: WorkOrderItem[];
    charges: WorkOrderCharge[];
    customerId: ID;
  }) => {
    setIsLoading(true);

    // TODO: Follow the rules about mutable service line items - i.e. add the option to include a custom sale in the referenced line item's quantity
    // TODO: Include labour SKU
    const { lineItems, customSales } = getWorkOrderLineItems(
      items,
      charges.filter(hasPropertyValue('type', 'hourly-labour')),
      charges.filter(hasPropertyValue('type', 'fixed-price-labour')),
    );

    await api.cart.clearCart();
    await api.cart.addCartProperties(getWorkOrderOrderCustomAttributes({ name: workOrderName }));
    await api.cart.setCustomer({ id: parseGid(customerId).id });

    for (const { quantity, title, unitPrice } of customSales) {
      await api.cart.addCustomSale({ quantity, title, price: unitPrice, taxable: true });
    }

    for (const { productVariantId, quantity } of lineItems) {
      await api.cart.addLineItem(parseGid(productVariantId).id, quantity);
    }

    const bulkAddLineItemProperties: SetLineItemPropertiesInput[] = [];

    for (const lineItem of cartRef.current.lineItems) {
      let customAttributes: Record<string, string> | undefined;

      if (lineItem.variantId) {
        customAttributes = lineItems.find(
          li => parseGid(li.productVariantId).id === lineItem.variantId,
        )?.customAttributes;
      } else if (lineItem.title) {
        customAttributes = customSales.find(li => li.title === lineItem.title)?.customAttributes;
      }

      if (customAttributes) {
        bulkAddLineItemProperties.push({ lineItemUuid: lineItem.uuid, properties: customAttributes });
      }
    }

    await api.cart.bulkAddLineItemProperties(bulkAddLineItemProperties);

    setIsLoading(false);
    api.navigation.dismiss();
  };

  return {
    handlePayment,
    isLoading,
  };
};

//
// /**
//  * Get line items for products (i.e. non custom sales)
//  */
// function getProductLineItems(createWorkOrder: CreateWorkOrder, workOrder: WorkOrder): AddLineItemSpec[] {
//   const lineItemsByProductVariantId = groupBy(createWorkOrder.lineItems, lineItem => lineItem.productVariantId);
//   const result: AddLineItemSpec[] = [];
//
//   for (const [productVariantId, lineItems] of entries(lineItemsByProductVariantId)) {
//     const lineItemUuids = new Set(lineItems.map(li => li.uuid));
//
//     let quantity: number;
//
//     if (isMutableServiceLineItem(productVariantId, workOrder)) {
//       // the quantity of mutable service line items is set such that it covers the price of all related charges
//       const charges = createWorkOrder.charges.filter(
//         charge => charge.lineItemUuid && lineItemUuids.has(charge.lineItemUuid),
//       );
//
//       const unitPrice =
//         workOrder.order.lineItems.find(hasNestedPropertyValue('variant.id', productVariantId))?.unitPrice ?? never();
//       const chargePrice = getTotalPriceForCharges(charges);
//
//       quantity = parseInt(
//         BigDecimal.max(
//           BigDecimal.ONE,
//           BigDecimal.fromMoney(chargePrice).divide(BigDecimal.fromMoney(unitPrice), 2).round(0, RoundingMode.CEILING),
//         ).toDecimal(),
//       );
//     } else {
//       // simply sum the quantities of all line items
//       quantity = sumMap(lineItems, li => li.quantity);
//     }
//
//     const customAttributes = getProductLineItemAttributes([...lineItemUuids]);
//
//     result.push({
//       productVariantId: parseGid(productVariantId).id,
//       quantity,
//       customAttributes,
//     });
//   }
//
//   return result;
// }
//
// /**
//  * Get line items for additional charges, i.e. custom sales
//  */
// function getChargeLineItems(createWorkOrder: CreateWorkOrder, workOrder: WorkOrder): AddCustomSaleSpec[] {
//   const mutableServiceLineItemUuids = createWorkOrder.lineItems
//     .filter(li => isMutableServiceLineItem(li.productVariantId, workOrder))
//     .map(li => li.uuid);
//
//   const chargesExcludingMutableServiceCharges = createWorkOrder.charges.filter(
//     charge => !charge.lineItemUuid || !mutableServiceLineItemUuids.includes(charge.lineItemUuid),
//   );
//
//   const groupedCharges = groupBy(chargesExcludingMutableServiceCharges, charge => charge.name);
//   const result: AddCustomSaleSpec[] = [];
//
//   for (const [baseName, charges] of entries(groupedCharges)) {
//     for (const [i, charge] of charges.entries()) {
//       // ensure every charge has a unique name, otherwise line items will be merged
//       const name = charges.length === 1 ? baseName : `${baseName} ${i + 1}`;
//       const price = getTotalPriceForCharges([charge]);
//
//       const customAttributes = getChargeLineItemAttributes(charge);
//
//       result.push({
//         title: name,
//         taxable: true,
//         quantity: 1,
//         price,
//         customAttributes,
//       });
//     }
//   }
//
//   return result;
// }
//
// function isMutableServiceLineItem(productVariantId: ID, workOrder: WorkOrder) {
//   const product = workOrder.order.lineItems.find(hasNestedPropertyValue('variant.id', productVariantId));
//   if (!product) return false;
//
//   return product.variant.product.isMutableServiceItem;
// }
//
// function getCartProperties(workOrder: WorkOrder) {
//   return attributesToProperties(WorkOrderOrderAttributesMapping, {
//     workOrder: workOrder.name,
//   });
// }
//
// function getProductLineItemAttributes(uuids: string[]) {
//   return attributesToProperties(WorkOrderOrderLineItemAttributesMapping, {
//     uuids,
//   });
// }
//
// function getChargeLineItemAttributes(labour: CreateWorkOrder['charges'][number], sku?: string) {
//   return attributesToProperties(WorkOrderOrderLineItemAttributesMapping, {
//     chargeLineItemUuid: labour.lineItemUuid,
//     sku: sku ?? null,
//   });
// }
