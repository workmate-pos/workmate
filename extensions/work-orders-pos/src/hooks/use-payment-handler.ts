import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useEffect, useRef, useState } from 'react';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { Cart } from '@shopify/retail-ui-extensions';
import { attributesToProperties } from '@work-orders/common/custom-attributes/mapping/index.js';
import { WorkOrderOrderAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order.js';
import { WorkOrderOrderLineItemAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order-line-item.js';
import { workOrderToCreateWorkOrder } from '../dto/work-order-to-create-work-order.js';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { getLabourPrice } from '../create-work-order/labour.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from './use-authenticated-fetch.js';
import { withResolvers } from '@teifi-digital/shopify-app-toolbox/promise';
import { createGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { groupBy, sumMap } from '@teifi-digital/shopify-app-toolbox/array';

const useCartRef = () => {
  const api = useExtensionApi<'pos.home.modal.render'>();
  const cartRef = useRef(api.cart.subscribable.initial);
  const promiseRef = useRef(withResolvers<Cart['lineItems'][number]>());

  useEffect(() => {
    api.cart.subscribable.subscribe(cart => {
      const newLineItem = cart.lineItems.find(
        lineItem =>
          !cartRef.current.lineItems.some(item => item.uuid === lineItem.uuid && item.quantity === lineItem.quantity),
      );

      if (newLineItem) {
        promiseRef.current.resolve(newLineItem);
        promiseRef.current = withResolvers();
      }

      cartRef.current = cart;
    });
  }, []);

  return {
    cartRef,
    getNewLineItem: () => promiseRef.current.promise,
  };
};

export type PaymentHandler = ReturnType<typeof usePaymentHandler>;

/**
 * Creates work order payments.
 */
export const usePaymentHandler = () => {
  const api = useExtensionApi<'pos.home.modal.render'>();
  const [isLoading, setIsLoading] = useState(false);
  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });

  const { cartRef, getNewLineItem } = useCartRef();

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
    await api.cart.setCustomer({ id: parseGid(createWorkOrder.customerId).id });

    if (createWorkOrder.discount) {
      await api.cart.applyCartDiscount(
        ({ FIXED_AMOUNT: 'FixedAmount', PERCENTAGE: 'Percentage' } as const)[createWorkOrder.discount.valueType],
        'Discount',
        String(createWorkOrder.discount.value),
      );
    }

    const groupedLabour = groupBy(createWorkOrder.labour, labour => labour.name);

    for (const labour of Object.values(groupedLabour)) {
      for (let i = 0; i < labour.length; i++) {
        const labourItem = labour[i]!;
        const price = getLabourPrice([labourItem]);

        let title = labourItem.name;

        if (labour.length > 1) {
          // pos orders the cart from newest to oldest, so add (1) last
          title += ` (${labour.length - i})`;
        }

        const addedLineItem = getNewLineItem();

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

    const groupedLineItems = groupBy(createWorkOrder.lineItems, lineItem => lineItem.productVariantId);

    // add product line items in parallel because `await api.cart.addLineItem(...)` takes 3 seconds !!!
    // we cannot do labour in parallel because mapping from added line item to labour item is difficult
    const addLineItemPromises = [];

    for (const lineItems of Object.values(groupedLineItems)) {
      const [lineItem] = lineItems;
      const quantity = sumMap(lineItems, li => li.quantity);

      if (quantity === 0 || !lineItem) {
        continue;
      }

      addLineItemPromises.push(api.cart.addLineItem(parseGid(lineItem.productVariantId).id, quantity));
    }

    await Promise.all(addLineItemPromises);

    for (const lineItem of cartRef.current.lineItems) {
      if (!lineItem.variantId) {
        continue;
      }

      const productVariantId = createGid('ProductVariant', lineItem.variantId.toString());
      const lineItemUuids = groupedLineItems[productVariantId]?.map(li => li.uuid);

      if (!lineItemUuids) {
        api.toast.show(`Could not find line item uuids for product variant ${productVariantId}`);
        continue;
      }

      const attributes = getProductLineItemAttributes(lineItemUuids);
      await api.cart.addLineItemProperties(lineItem.uuid, attributes);
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
