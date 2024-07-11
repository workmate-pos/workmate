import { useExtensionApi, useStatefulSubscribableCart } from '@shopify/retail-ui-extensions-react';
import { useEffect, useRef, useState } from 'react';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { SetLineItemPropertiesInput } from '@shopify/retail-ui-extensions';
import {
  getWorkOrderLineItems,
  getWorkOrderOrderCustomAttributes,
  WorkOrderItem,
} from '@work-orders/work-order-shopify-order';
import { WorkOrderCharge } from '@web/services/work-orders/types.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';

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
    customFields,
    items,
    charges,
    customerId,
    labourSku,
    discount,
  }: {
    workOrderName: string;
    // TODO: Maybe fetch the work order directly in here?
    customFields: Record<string, string>;
    items: WorkOrderItem[];
    charges: DiscriminatedUnionOmit<WorkOrderCharge, 'shopifyOrderLineItem'>[];
    customerId: ID | null;
    labourSku: string;
    discount: {
      type: 'FIXED_AMOUNT' | 'PERCENTAGE';
      value: string;
    } | null;
  }) => {
    setIsLoading(true);

    const { lineItems, customSales } = getWorkOrderLineItems(
      items.filter(hasPropertyValue('type', 'product')),
      items.filter(hasPropertyValue('type', 'custom-item')),
      charges.filter(hasPropertyValue('type', 'hourly-labour')),
      charges.filter(hasPropertyValue('type', 'fixed-price-labour')),
      { labourSku, workOrderName },
    );

    await cart.clearCart();
    await cart.addCartProperties(
      getWorkOrderOrderCustomAttributes({
        name: workOrderName,
        customFields,
      }),
    );

    if (customerId) {
      await cart.setCustomer({ id: Number(parseGid(customerId).id) });
    }

    for (const { quantity, title, unitPrice, taxable } of customSales) {
      await cart.addCustomSale({ quantity, title, price: unitPrice, taxable });
    }

    for (const { productVariantId, quantity } of lineItems) {
      await cart.addLineItem(Number(parseGid(productVariantId).id), quantity);
    }

    const bulkAddLineItemProperties: SetLineItemPropertiesInput[] = [];

    for (const lineItem of cartRef.current.lineItems) {
      let customAttributes: Record<string, string> | undefined;

      if (lineItem.variantId) {
        customAttributes = lineItems.find(
          li => Number(parseGid(li.productVariantId).id) === lineItem.variantId,
        )?.customAttributes;
      } else if (lineItem.title) {
        customAttributes = customSales.find(li => li.title === lineItem.title)?.customAttributes;
      }

      if (customAttributes) {
        bulkAddLineItemProperties.push({ lineItemUuid: lineItem.uuid, properties: customAttributes });
      }
    }

    await cart.bulkAddLineItemProperties(bulkAddLineItemProperties);

    if (discount) {
      const discountType = ({ FIXED_AMOUNT: 'FixedAmount', PERCENTAGE: 'Percentage' } as const)[discount.type];
      await cart.applyCartDiscount(discountType, 'Discount', discount.value);
    }

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
