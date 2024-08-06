import { useExtensionApi, useStatefulSubscribableCart } from '@shopify/retail-ui-extensions-react';
import { useEffect, useRef, useState } from 'react';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { SetLineItemPropertiesInput } from '@shopify/retail-ui-extensions';
import { getCustomAttributeObjectFromArray } from '@work-orders/work-order-shopify-order';
import { DraftOrderInput } from '@web/services/gql/queries/generated/schema.js';

export type PaymentHandler = ReturnType<typeof usePaymentHandler>;

/**
 * Creates work order payments.
 */
export const usePaymentHandler = () => {
  const { cart, navigation, toast } = useExtensionApi<'pos.home.modal.render'>();
  const [isLoading, setIsLoading] = useState(false);

  const cartRef = useCartRef();

  const handlePayment = async (draftOrderInput: DraftOrderInput) => {
    setIsLoading(true);

    await cart.clearCart();
    await cart.addCartProperties(getCustomAttributeObjectFromArray([...(draftOrderInput.customAttributes ?? [])]));

    if (draftOrderInput.purchasingEntity?.customerId) {
      const id = Number(parseGid(draftOrderInput.purchasingEntity?.customerId).id);
      await cart.setCustomer({ id });
    }

    const lineItems = draftOrderInput.lineItems ?? [];
    for (const lineItem of [...lineItems].reverse()) {
      if (lineItem.variantId) {
        const { variantId, quantity } = lineItem;
        const id = Number(parseGid(variantId).id);
        await cart.addLineItem(id, quantity);
      } else {
        const { title, originalUnitPrice: price, quantity, taxable } = lineItem;

        if (!title) {
          toast.show('Unexpected line item without title, skipping');
          continue;
        }

        if (!price) {
          toast.show('Unexpected line item without price, skipping');
          continue;
        }

        if (typeof taxable !== 'boolean') {
          toast.show('Unexpected line item without taxable, skipping');
          continue;
        }

        await cart.addCustomSale({ quantity, title, price, taxable });
      }
    }

    const bulkAddLineItemProperties: SetLineItemPropertiesInput[] = [];

    for (const lineItem of cartRef.current.lineItems) {
      let customAttributes: Record<string, string> | undefined;

      if (lineItem.variantId) {
        const draftOrderInputLineItem = draftOrderInput.lineItems?.find(
          li => !!li.variantId && parseGid(li.variantId).id === String(lineItem.variantId),
        );
        customAttributes = getCustomAttributeObjectFromArray([...(draftOrderInputLineItem?.customAttributes ?? [])]);
      } else if (lineItem.title) {
        const draftOrderInputLineItem = draftOrderInput.lineItems?.find(
          li => !li.variantId && li.title === lineItem.title,
        );
        customAttributes = getCustomAttributeObjectFromArray([...(draftOrderInputLineItem?.customAttributes ?? [])]);
      }

      if (customAttributes) {
        bulkAddLineItemProperties.push({ lineItemUuid: lineItem.uuid, properties: customAttributes });
      }
    }

    await cart.bulkAddLineItemProperties(bulkAddLineItemProperties);

    if (draftOrderInput.appliedDiscount) {
      const type = (
        {
          FIXED_AMOUNT: 'FixedAmount',
          PERCENTAGE: 'Percentage',
        } as const
      )[draftOrderInput.appliedDiscount.valueType];
      const amount = String(draftOrderInput.appliedDiscount.value);
      await cart.applyCartDiscount(type, 'Discount', amount);
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
