import { useCartSubscription, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useEffect, useRef, useState } from 'react';
import { parseGid } from '@work-orders/common/util/gid.js';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { Cart } from '@shopify/retail-ui-extensions';
import { withResolvers } from '@work-orders/common/util/promise.js';
import { attributesToProperties } from '@work-orders/common/custom-attributes/mapping/index.js';
import { WorkOrderOrderAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order.js';
import { WorkOrderOrderLineItemAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order-line-item.js';

const useCart = () => {
  const api = useExtensionApi<'pos.home.modal.render'>();
  const cart = useCartSubscription();

  const [previousCart, setPreviousCart] = useState<Cart>(api.cart.subscribable.initial);
  const [currentCart, setCurrentCart] = useState<Cart>(cart);

  useEffect(() => {
    setPreviousCart(currentCart);
    setCurrentCart(cart);
  }, [cart]);

  return { previousCart, currentCart };
};

const useNewestLineItemPromise = (): { current: { promise: Promise<Cart['lineItems'][number]> } } => {
  const { previousCart, currentCart } = useCart();
  const promiseRef = useRef(withResolvers<Cart['lineItems'][number]>());

  useEffect(() => {
    const newLineItem = currentCart.lineItems.find(
      lineItem => previousCart.lineItems.find(item => item.uuid === lineItem.uuid)?.quantity !== lineItem.quantity,
    );

    if (newLineItem) {
      promiseRef.current.resolve(newLineItem);
      promiseRef.current = withResolvers();
    }
  }, [previousCart, currentCart]);

  return promiseRef;
};

export type PaymentHandler = ReturnType<typeof usePaymentHandler>;

/**
 * Creates work order payments.
 * Attributes should always be the same as the ones in web/services/work-orders/upsert.ts !!!
 */
export const usePaymentHandler = () => {
  const api = useExtensionApi<'pos.home.modal.render'>();
  const [isLoading, setIsLoading] = useState(false);
  const newestLineItemPromiseRef = useNewestLineItemPromise();

  const handlePayment = async ({ workOrder }: { workOrder: WorkOrder }) => {
    setIsLoading(true);

    if (workOrder.order.type === 'order') {
      api.toast.show(
        `This order has already been (partialy) paid - navigate to order ${workOrder.order.id} to make further payments`,
      );
      setIsLoading(false);
      return;
    }

    api.toast.show('Preparing payment', { duration: 1000 });

    await api.cart.clearCart();

    await api.cart.addCartProperties(getCartProperties(workOrder));

    for (const lineItem of workOrder.order.lineItems) {
      const addedLineItem = newestLineItemPromiseRef.current.promise;

      if (lineItem.variant) {
        await api.cart.addLineItem(parseGid(lineItem.variant.id).id, lineItem.quantity);
      } else {
        await api.cart.addCustomSale({
          // TODO: SKU
          title: lineItem.title,
          quantity: lineItem.quantity,
          price: lineItem.unitPrice,
          taxable: lineItem.taxable,
        });
      }

      const { uuid } = await addedLineItem;
      await api.cart.addLineItemProperties(uuid, getLineItemAttributes(lineItem));
    }

    await api.cart.setCustomer({ id: parseGid(workOrder.customerId).id });

    if (workOrder.order.discount) {
      await api.cart.applyCartDiscount(
        ({ FIXED_AMOUNT: 'FixedAmount', PERCENTAGE: 'Percentage' } as const)[workOrder.order.discount.valueType],
        'Discount',
        String(workOrder.order.discount.value),
      );
    }

    api.navigation.dismiss();

    setIsLoading(false);
  };

  return {
    handlePayment,
    isLoading,
  };
};

function getCartProperties(workOrder: WorkOrder) {
  return attributesToProperties(WorkOrderOrderAttributesMapping, {
    workOrder: workOrder.name,
  });
}

function getLineItemAttributes(lineItem: WorkOrder['order']['lineItems'][number]) {
  return attributesToProperties(WorkOrderOrderLineItemAttributesMapping, {
    labourLineItem: lineItem.attributes.labourLineItem,
    placeholderLineItem: lineItem.attributes.placeholderLineItem,
  });
}
