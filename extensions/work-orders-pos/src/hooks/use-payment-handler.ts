import { useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useEffect, useRef, useState } from 'react';
import { WorkOrder } from '@web/services/work-orders/types.js';
import { attributesToProperties } from '@work-orders/common/custom-attributes/mapping/index.js';
import { WorkOrderOrderAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order.js';
import { WorkOrderOrderLineItemAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order-line-item.js';
import { workOrderToCreateWorkOrder } from '../dto/work-order-to-create-work-order.js';
import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { getChargesPrice } from '../create-work-order/charges.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from './use-authenticated-fetch.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { groupBy, sumMap } from '@teifi-digital/shopify-app-toolbox/array';
import { hasNestedPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal, Money, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';

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

    const productLineItems = getProductLineItems(createWorkOrder, workOrder);
    const chargeLineItems = getChargeLineItems(createWorkOrder);

    const addLineItemPromises = [];

    for (const { quantity, title, price, taxable } of chargeLineItems) {
      addLineItemPromises.push(api.cart.addCustomSale({ quantity, title, price, taxable }));
    }

    for (const { productVariantId, quantity } of productLineItems) {
      addLineItemPromises.push(api.cart.addLineItem(productVariantId, quantity));
    }

    await Promise.all(addLineItemPromises);

    const addAttributePromises = [];

    for (const lineItem of cartRef.current.lineItems) {
      let customAttributes: Record<string, string> | undefined;

      if (lineItem.variantId) {
        customAttributes = productLineItems.find(li => li.productVariantId === lineItem.variantId)?.customAttributes;
      } else if (lineItem.title) {
        customAttributes = chargeLineItems.find(li => li.title === lineItem.title)?.customAttributes;
      }

      if (customAttributes) {
        addAttributePromises.push(api.cart.addLineItemProperties(lineItem.uuid, customAttributes));
      }
    }

    await Promise.all(addAttributePromises);

    api.navigation.dismiss();

    setIsLoading(false);
  };

  return {
    handlePayment,
    isLoading,
  };
};

type AddLineItemSpec = { productVariantId: number; quantity: number; customAttributes: Record<string, string> };
type AddCustomSaleSpec = {
  taxable: boolean;
  quantity: number;
  title: string;
  price: Money;
  customAttributes: Record<string, string>;
};

/**
 * Get line items for products (i.e. non custom sales)
 */
function getProductLineItems(createWorkOrder: CreateWorkOrder, workOrder: WorkOrder): AddLineItemSpec[] {
  const lineItemsByProductVariantId = groupBy(createWorkOrder.lineItems, lineItem => lineItem.productVariantId);
  const result: AddLineItemSpec[] = [];

  for (const [productVariantId, lineItems] of entries(lineItemsByProductVariantId)) {
    const lineItemUuids = new Set(lineItems.map(li => li.uuid));

    let quantity: number;

    if (isMutableServiceLineItem(productVariantId, workOrder)) {
      // the quantity of mutable service line items is set such that it covers the price of all related charges
      const charges = createWorkOrder.charges.filter(
        charge => charge.lineItemUuid && lineItemUuids.has(charge.lineItemUuid),
      );

      const unitPrice =
        workOrder.order.lineItems.find(hasNestedPropertyValue('variant.id', productVariantId))?.unitPrice ?? never();
      const chargePrice = getChargesPrice(charges);

      quantity = parseInt(
        BigDecimal.max(
          BigDecimal.ONE,
          BigDecimal.fromMoney(chargePrice).divide(BigDecimal.fromMoney(unitPrice), 2).round(0, RoundingMode.CEILING),
        ).toDecimal(),
      );
    } else {
      // simply sum the quantities of all line items
      quantity = sumMap(lineItems, li => li.quantity);
    }

    const customAttributes = getProductLineItemAttributes([...lineItemUuids]);

    result.push({
      productVariantId: parseGid(productVariantId).id,
      quantity,
      customAttributes,
    });
  }

  return result;
}

/**
 * Get line items for additional charges, i.e. custom sales
 */
function getChargeLineItems(createWorkOrder: CreateWorkOrder): AddCustomSaleSpec[] {
  const groupedCharges = groupBy(createWorkOrder.charges, charge => charge.name);
  const result: AddCustomSaleSpec[] = [];

  for (const [baseName, charges] of entries(groupedCharges)) {
    for (const [i, charge] of charges.entries()) {
      // ensure every charge has a unique name, otherwise line items will be merged
      const name = charges.length === 1 ? baseName : `${baseName} ${i + 1}`;
      const price = getChargesPrice([charge]);

      const customAttributes = getChargeLineItemAttributes(charge);

      result.push({
        title: name,
        taxable: true,
        quantity: 1,
        price,
        customAttributes,
      });
    }
  }

  return result;
}

function isMutableServiceLineItem(productVariantId: ID, workOrder: WorkOrder) {
  const product = workOrder.order.lineItems.find(hasNestedPropertyValue('variant.id', productVariantId));
  if (!product) return false;

  return product.variant.product.isMutableServiceItem;
}

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

function getChargeLineItemAttributes(labour: CreateWorkOrder['charges'][number], sku?: string) {
  return attributesToProperties(WorkOrderOrderLineItemAttributesMapping, {
    chargeLineItemUuid: labour.lineItemUuid,
    sku: sku ?? null,
  });
}
