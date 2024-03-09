import { useExtensionApi, useStatefulSubscribableCart } from '@shopify/retail-ui-extensions-react';
import { useEffect, useRef, useState } from 'react';
import { WorkOrderCharge, WorkOrderItem } from '@web/services/work-orders/types.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { SetLineItemPropertiesInput } from '@shopify/retail-ui-extensions';
import { getWorkOrderLineItems, getWorkOrderOrderCustomAttributes } from '@work-orders/work-order-shopify-order';

export type PaymentHandler = ReturnType<typeof usePaymentHandler>;

/**
 * Creates work order payments.
 */
export const usePaymentHandler = () => {
  const { cart, navigation } = useExtensionApi<'pos.home.modal.render'>();
  const [isLoading, setIsLoading] = useState(false);

  const cartRef = useCartRef();

  const handlePayment = async ({
    workOrderName,
    items,
    charges,
    customerId,
    labourSku,
  }: {
    workOrderName: string;
    items: WorkOrderItem[];
    charges: WorkOrderCharge[];
    customerId: ID;
    labourSku: string;
  }) => {
    setIsLoading(true);

    const { lineItems, customSales } = getWorkOrderLineItems(
      items,
      charges.filter(hasPropertyValue('type', 'hourly-labour')),
      charges.filter(hasPropertyValue('type', 'fixed-price-labour')),
      { labourSku },
    );

    await cart.clearCart();
    await cart.addCartProperties(getWorkOrderOrderCustomAttributes({ name: workOrderName }));
    await cart.setCustomer({ id: parseGid(customerId).id });

    for (const { quantity, title, unitPrice } of customSales) {
      await cart.addCustomSale({ quantity, title, price: unitPrice, taxable: true });
    }

    for (const { productVariantId, quantity } of lineItems) {
      await cart.addLineItem(parseGid(productVariantId).id, quantity);
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

    await cart.bulkAddLineItemProperties(bulkAddLineItemProperties);

    navigation.dismiss();
    setIsLoading(false);
  };

  return {
    handlePayment,
    isLoading,
  };
};

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
