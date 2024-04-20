import { useExtensionApi, useStatefulSubscribableCart } from '@shopify/retail-ui-extensions-react';
import { useEffect, useRef, useState } from 'react';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { SetLineItemPropertiesInput } from '@shopify/retail-ui-extensions';
import {
  getDepositCustomSale,
  getWorkOrderAppliedDiscount,
  getWorkOrderLineItems,
  getWorkOrderOrderCustomAttributes,
  WorkOrderItem,
} from '@work-orders/work-order-shopify-order';
import { WorkOrderCharge } from '@web/services/work-orders/types.js';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { uuid } from '../util/uuid.js';

export type PaymentHandler = ReturnType<typeof usePaymentHandler>;

/**
 * Creates work order payments.
 */
export const usePaymentHandler = () => {
  const { cart, navigation } = useExtensionApi<'pos.home.modal.render'>();
  const [isLoading, setIsLoading] = useState(false);

  const cartRef = useCartRef();

  const handleDeposit = async ({
    workOrderName,
    customerId,
    deposit,
  }: {
    workOrderName: string;
    customerId: ID;
    deposit: Money;
  }) => {
    setIsLoading(true);

    await cart.clearCart();
    await cart.addCartProperties(getWorkOrderOrderCustomAttributes({ name: workOrderName }));
    await cart.setCustomer({ id: Number(parseGid(customerId).id) });

    const { quantity, title, unitPrice, taxable, customAttributes } = getDepositCustomSale({
      uuid: uuid(),
      amount: deposit,
    });

    await cart.addCustomSale({ quantity, title, price: unitPrice, taxable });

    const lineItemUuid = cartRef.current.lineItems.find(li => !li.variantId && li.title === title)?.uuid;

    if (lineItemUuid) {
      await cart.addLineItemProperties(lineItemUuid, customAttributes);
    }

    navigation.dismiss();
    setIsLoading(false);
  };

  const handlePayment = async ({
    workOrderName,
    items,
    charges,
    customerId,
    labourSku,
    discount,
    depositedAmount,
    depositedReconciledAmount,
  }: {
    workOrderName: string;
    items: WorkOrderItem[];
    charges: DiscriminatedUnionOmit<WorkOrderCharge, 'shopifyOrderLineItem'>[];
    customerId: ID;
    labourSku: string;
    discount: {
      type: 'FIXED_AMOUNT' | 'PERCENTAGE';
      value: string;
    } | null;
    depositedAmount: Money;
    depositedReconciledAmount: Money;
  }) => {
    setIsLoading(true);

    const { lineItems, customSales } = getWorkOrderLineItems(
      items,
      charges.filter(hasPropertyValue('type', 'hourly-labour')),
      charges.filter(hasPropertyValue('type', 'fixed-price-labour')),
      // TODO: Include discount here as well
      // TODO !!!
      { labourSku },
    );

    await cart.clearCart();
    await cart.addCartProperties(getWorkOrderOrderCustomAttributes({ name: workOrderName }));
    await cart.setCustomer({ id: Number(parseGid(customerId).id) });

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

    const appliedDiscount = getWorkOrderAppliedDiscount(discount, { depositedAmount, depositedReconciledAmount });

    if (appliedDiscount) {
      const discountType = ({ FIXED_AMOUNT: 'FixedAmount', PERCENTAGE: 'Percentage' } as const)[
        appliedDiscount.valueType
      ];
      await cart.applyCartDiscount(discountType, appliedDiscount.title ?? '', String(appliedDiscount.value));
    }

    navigation.dismiss();
    setIsLoading(false);
  };

  return {
    handlePayment,
    handleDeposit,
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
