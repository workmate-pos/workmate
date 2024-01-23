import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useEffect, useRef, useState } from 'react';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { attributesToProperties } from '@work-orders/common/custom-attributes/mapping/index.js';
import { WorkOrderOrderAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order.js';
import { WorkOrderOrderLineItemAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order-line-item.js';
import { workOrderToCreateWorkOrder } from '../dto/work-order-to-create-work-order.js';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { getLabourPrice } from '../create-work-order/labour.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from './use-authenticated-fetch.js';
import { createGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { groupBy, sumMap } from '@teifi-digital/shopify-app-toolbox/array';

const useCartRef = () => {
  const api = useExtensionApi<'pos.home.modal.render'>();
  const cartRef = useRef(api.cart.subscribable.initial);

  useEffect(() => {
    api.cart.subscribable.subscribe(cart => {
      cartRef.current = cart;
    });
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
  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });

  const cartRef = useCartRef();

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

    // these only work in sequence
    await api.cart.addCartProperties(getCartProperties(workOrder));
    await api.cart.setCustomer({ id: parseGid(createWorkOrder.customerId).id });

    if (createWorkOrder.discount) {
      await api.cart.applyCartDiscount(
        ({ FIXED_AMOUNT: 'FixedAmount', PERCENTAGE: 'Percentage' } as const)[createWorkOrder.discount.valueType],
        'Discount',
        createWorkOrder.discount.value,
      );
    }

    const groupedLabour = groupBy(createWorkOrder.labour, labour => labour.name);
    // rename labour such that every labour item has a unique name (must have a unique name to prevent line item merging)
    const renamedLabour = Object.fromEntries(
      Object.entries(groupedLabour).flatMap(([name, labour]) => labour.map((l, i) => [`${name} ${i + 1}`, l])),
    );

    const addCustomSalePromises = [];

    for (const [title, labour] of Object.entries(renamedLabour)) {
      const price = getLabourPrice([labour]);

      addCustomSalePromises.push(
        api.cart.addCustomSale({
          taxable: true,
          quantity: 1,
          title,
          price,
        }),
      );
    }

    const groupedLineItems = groupBy(createWorkOrder.lineItems, lineItem => lineItem.productVariantId);

    const addLineItemPromises = [];

    for (const lineItems of Object.values(groupedLineItems)) {
      const [lineItem] = lineItems;
      const quantity = sumMap(lineItems, li => li.quantity);

      if (quantity === 0 || !lineItem) {
        continue;
      }

      addLineItemPromises.push(api.cart.addLineItem(parseGid(lineItem.productVariantId).id, quantity));
    }

    await Promise.all(addCustomSalePromises);
    await Promise.all(addLineItemPromises);

    const addAttributePromises = [];

    for (const lineItem of cartRef.current.lineItems) {
      if (lineItem.variantId) {
        const productVariantId = createGid('ProductVariant', lineItem.variantId.toString());
        const lineItemUuids = groupedLineItems[productVariantId]?.map(li => li.uuid);

        if (!lineItemUuids) {
          api.toast.show(`Could not find line item uuids for product variant ${productVariantId}`);
          continue;
        }

        const attributes = getProductLineItemAttributes(lineItemUuids);
        addAttributePromises.push(api.cart.addLineItemProperties(lineItem.uuid, attributes));
      } else if (lineItem.title) {
        const labourItem = renamedLabour[lineItem.title];
        if (!labourItem) continue; // should be impossible
        const attributes = getLabourLineItemAttributes(labourItem, settingsQuery.data.settings.labourLineItemSKU);
        addAttributePromises.push(api.cart.addLineItemProperties(lineItem.uuid, attributes));
      }
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
