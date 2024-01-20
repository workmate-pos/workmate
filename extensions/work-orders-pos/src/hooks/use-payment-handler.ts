import { useCartSubscription, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useEffect, useRef, useState } from 'react';
import { parseGid } from '@work-orders/common/util/gid.js';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { Cart } from '@shopify/retail-ui-extensions';
import { withResolvers } from '@work-orders/common/util/promise.js';
import { attributesToProperties } from '@work-orders/common/custom-attributes/mapping/index.js';
import { WorkOrderOrderAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order.js';
import { WorkOrderOrderLineItemAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order-line-item.js';
import { groupBy } from '@web/util/array.js';
import { sum } from '@work-orders/common/util/array.js';
import { workOrderToCreateWorkOrder } from '../dto/work-order-to-create-work-order.js';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { getLabourPrice } from '../create-work-order/labour.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from './use-authenticated-fetch.js';

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
 *
 * Relies on CustomAttributes, so make sure to save the work order right before initiating the payment,
 * otherwise the merchant may change/delete the attributes
 */
export const usePaymentHandler = () => {
  const api = useExtensionApi<'pos.home.modal.render'>();
  const [isLoading, setIsLoading] = useState(false);
  const newestLineItemPromiseRef = useNewestLineItemPromise();
  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });

  const handlePayment = async ({ workOrder }: { workOrder: WorkOrder }) => {
    if (settingsQuery.isLoading) {
      api.toast.show('Please wait until the settings are loaded');
      return;
    }

    if (!settingsQuery.data) {
      api.toast.show('Settings could not be loaded, try reloading the app');
      return;
    }

    setIsLoading(true);

    if (workOrder.order.type === 'order') {
      api.toast.show(
        `This order has already been (partialy) paid - navigate to order ${workOrder.order.id} to make further payments`,
      );
      setIsLoading(false);
      return;
    }

    api.toast.show('Preparing payment', { duration: 1000 });

    // just like the backend we construct the payment from a CreateWorkOrder (a bit easier with uuid mappings)
    const createWorkOrder = workOrderToCreateWorkOrder(workOrder);

    await api.cart.clearCart();

    await api.cart.addCartProperties(getCartProperties(workOrder));

    const groupedLabour = groupBy(createWorkOrder.labour, labour => labour.name);

    for (const labour of Object.values(groupedLabour)) {
      for (let i = 0; i < labour.length; i++) {
        const addedLineItem = newestLineItemPromiseRef.current.promise;

        const labourItem = labour[i]!;
        const price = getLabourPrice([labourItem]);

        let title = labourItem.name;

        if (labour.length > 1) {
          // pos orders the cart from newest to oldest, so add (1) last
          title += ` (${labour.length - i})`;
        }

        await api.cart.addCustomSale({
          taxable: true,
          quantity: 1,
          title,
          price,
        });

        const { uuid } = await addedLineItem;
        const attributes = getLabourLineItemAttributes(
          labourItem,
          settingsQuery.data.settings.labourLineItemSKU || undefined,
        );
        await api.cart.addLineItemProperties(uuid, attributes);
      }
    }

    // we only care about product line items, as all custom sales will be created from labour
    const groupedLineItems = groupBy(createWorkOrder.lineItems, lineItem => lineItem.productVariantId);

    for (const lineItems of Object.values(groupedLineItems)) {
      const addedLineItem = newestLineItemPromiseRef.current.promise;

      const [lineItem] = lineItems;
      const quantity = sum(lineItems, li => li.quantity);

      if (quantity === 0 || !lineItem) {
        continue;
      }

      await api.cart.addLineItem(parseGid(lineItem.productVariantId).id, quantity);

      const lineItemUuids = lineItems.map(li => li.uuid);

      const { uuid } = await addedLineItem;
      const attributes = getProductLineItemAttributes(lineItemUuids);
      await api.cart.addLineItemProperties(uuid, attributes);
    }

    await api.cart.setCustomer({ id: parseGid(createWorkOrder.customerId).id });

    if (createWorkOrder.discount) {
      await api.cart.applyCartDiscount(
        ({ FIXED_AMOUNT: 'FixedAmount', PERCENTAGE: 'Percentage' } as const)[createWorkOrder.discount.valueType],
        'Discount',
        String(createWorkOrder.discount.value),
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

function getProductLineItemAttributes(uuids: string[]) {
  return attributesToProperties(WorkOrderOrderLineItemAttributesMapping, {
    uuids,
  });
}

function getLabourLineItemAttributes(labour: CreateWorkOrder['labour'][number], sku?: string) {
  return attributesToProperties(WorkOrderOrderLineItemAttributesMapping, {
    labourLineItemUuid: labour.lineItemUuid,
    sku: sku ?? null,
  });
}
