import { Liquid } from 'liquidjs';
import { db } from '../../db/db.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { indexBy, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { BigDecimal, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import {
  IGetFixedPriceLabourChargesResult,
  IGetHourlyLabourChargesResult,
} from '../../db/queries/generated/work-order-charges.sql.js';
import { ShopSettings } from '../../../schemas/generated/shop-settings.js';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';

export async function getRenderedWorkOrderTemplate(
  printTemplate: ShopSettings['workOrderPrintTemplates'][string],
  context: WorkOrderTemplateData,
) {
  const { template, subject } = printTemplate;

  const liquid = new Liquid();

  return await awaitNested({
    subject: liquid.render(liquid.parse(subject), context),
    html: liquid.render(liquid.parse(template), context),
  });
}

export async function getWorkOrderTemplateData(
  shop: string,
  workOrderName: string,
  clientDate: string,
): Promise<WorkOrderTemplateData> {
  const {
    shopifyOrderLineItemsByLineItemId,
    shopifyOrdersByOrderId,
    workOrderItems,
    productVariantsById,
    productsById,
    purchaseOrderLineItemByShopifyLineItemId,
    purchaseOrderById,
    workOrderHourlyLabourCharges,
    workOrderFixedPriceLabourCharges,
    workOrderCustomFields,
    customer,
    purchaseOrderNames,
    shopifyOrderNames,
    status,
    shopifyOrderLineItemById,
  } = await getWorkOrderInfo(shop, workOrderName);

  function getHourlyLabourChargeData(hourlyCharge: IGetHourlyLabourChargesResult): WorkOrderTemplateCharge {
    assertShopifyOrderLineItemIdIsSet(hourlyCharge);

    const shopifyOrderLineItem =
      shopifyOrderLineItemsByLineItemId[hourlyCharge.shopifyOrderLineItemId] ?? never('hlc no sli');
    const shopifyOrder = shopifyOrdersByOrderId[shopifyOrderLineItem.orderId] ?? never('hlc sli no so');

    return {
      name: hourlyCharge.name,
      paid: shopifyOrder.fullyPaid,
      totalPrice: getHourlyChargePrice(hourlyCharge),
      details: `${hourlyCharge.hours} hours × ${hourlyCharge.rate}`,
      shopifyOrderName: shopifyOrder?.orderType === 'ORDER' ? shopifyOrder.name : null,
    };
  }

  function getFixedLabourChargeData(fixedPriceCharge: IGetFixedPriceLabourChargesResult): WorkOrderTemplateCharge {
    assertShopifyOrderLineItemIdIsSet(fixedPriceCharge);

    const shopifyOrderLineItem =
      shopifyOrderLineItemsByLineItemId[fixedPriceCharge.shopifyOrderLineItemId] ?? never('flc no sli');
    const shopifyOrder = shopifyOrdersByOrderId[shopifyOrderLineItem.orderId] ?? never('flc no so');

    return {
      name: fixedPriceCharge.name,
      paid: shopifyOrder.fullyPaid,
      totalPrice: getFixedPriceChargePrice(fixedPriceCharge),
      details: `${fixedPriceCharge.amount}`,
      shopifyOrderName: shopifyOrder?.orderType === 'ORDER' ? shopifyOrder.name : null,
    };
  }

  const items = workOrderItems.map<WorkOrderTemplateItem>(item => {
    assertShopifyOrderLineItemIdIsSet(item);

    const productVariant = productVariantsById[item.productVariantId] ?? never('no pv');
    const product = productsById[productVariant.productId] ?? never('no p');
    const name =
      getProductVariantName({
        title: productVariant.title,
        product: { title: product.title, hasOnlyDefaultVariant: product.productVariantCount === 1 },
      }) ?? never('no pv name');

    const shopifyOrderLineItem = shopifyOrderLineItemById[item.shopifyOrderLineItemId] ?? never('item no sli');
    const shopifyOrder = shopifyOrdersByOrderId[shopifyOrderLineItem.orderId] ?? never('item sli no so');

    const purchaseOrderLineItem = purchaseOrderLineItemByShopifyLineItemId[item.shopifyOrderLineItemId];
    const purchaseOrder = purchaseOrderLineItem?.purchaseOrderId
      ? purchaseOrderById[purchaseOrderLineItem.purchaseOrderId]
      : null;

    const itemHourlyLabourCharges = workOrderHourlyLabourCharges.filter(
      hasPropertyValue('workOrderItemUuid', item.uuid),
    );

    const itemFixedLabourCharges = workOrderFixedPriceLabourCharges.filter(
      hasPropertyValue('workOrderItemUuid', item.uuid),
    );

    const charges = [
      ...itemHourlyLabourCharges.map(getHourlyLabourChargeData),
      ...itemFixedLabourCharges.map(getFixedLabourChargeData),
    ];

    const quantityBigDecimal = BigDecimal.fromString(item.quantity.toFixed(0));
    const originalTotalPrice = quantityBigDecimal
      .multiply(BigDecimal.fromString(shopifyOrderLineItem.unitPrice))
      .toString();
    const discountedTotalPrice = quantityBigDecimal
      .multiply(BigDecimal.fromString(shopifyOrderLineItem.discountedUnitPrice))
      .toString();

    // Charges related to this item may have a different shopify line item. We should include them in this item's price.
    const chargeShopifyLineItemIds = unique(
      [...itemHourlyLabourCharges, ...itemFixedLabourCharges]
        .map(charge => {
          // TODO: Fix this - it is not correct since the line items may also include other stuff - instead, just use the charge price directly, and apply discount proportional to the line item discount
          assertShopifyOrderLineItemIdIsSet(charge);

          if (charge.shopifyOrderLineItemId === item.shopifyOrderLineItemId) {
            return null;
          }

          return charge.shopifyOrderLineItemId;
        })
        .filter(isNonNullable),
    );

    let chargesTotalPrice = BigDecimal.ZERO;

    for (const shopifyLineItemId of chargeShopifyLineItemIds) {
      const shopifyLineItem = shopifyOrderLineItemsByLineItemId[shopifyLineItemId] ?? never();
      chargesTotalPrice = chargesTotalPrice.add(
        BigDecimal.fromString(shopifyLineItem.discountedUnitPrice).multiply(
          BigDecimal.fromString(shopifyLineItem.quantity.toFixed(0)),
        ),
      );
    }

    return {
      name,
      charges,
      sku: productVariant.sku,
      paid: shopifyOrder?.fullyPaid ?? false,
      description: product.description,
      discountedTotalPrice,
      originalTotalPrice,
      discountedUnitPrice: shopifyOrderLineItem.discountedUnitPrice,
      originalUnitPrice: shopifyOrderLineItem.unitPrice,
      purchaseOrderName: purchaseOrder?.name ?? null,
      shopifyOrderName: shopifyOrder?.name ?? null,
      quantity: item.quantity,
      purchaseOrderLineItem: purchaseOrderLineItem
        ? {
            quantity: purchaseOrderLineItem.quantity,
            availableQuantity: purchaseOrderLineItem.quantity,
          }
        : null,
    };
  });

  const itemlessHourlyLabourCharges = workOrderHourlyLabourCharges.filter(hasPropertyValue('workOrderItemUuid', null));
  const itemlessFixedPriceLabourCharges = workOrderFixedPriceLabourCharges.filter(
    hasPropertyValue('workOrderItemUuid', null),
  );

  const charges = [
    ...itemlessHourlyLabourCharges.map(getHourlyLabourChargeData),
    ...itemlessFixedPriceLabourCharges.map(getFixedLabourChargeData),
  ];

  const subtotal = BigDecimal.sum(
    ...Object.values(shopifyOrderLineItemsByLineItemId).map(li =>
      BigDecimal.fromString(li.discountedUnitPrice).multiply(BigDecimal.fromString(li.quantity.toFixed(0))),
    ),
  );

  const tax = BigDecimal.sum(
    ...Object.values(shopifyOrderLineItemsByLineItemId).map(li => BigDecimal.fromString(li.totalTax)),
  );

  const total = subtotal.add(tax);

  return {
    name: workOrderName,
    status,
    date: clientDate,
    shopifyOrderNames,
    purchaseOrderNames,
    customer: {
      name: customer.displayName,
      address: customer.address,
      email: customer.email,
      phone: customer.phone,
    },
    customFields: Object.fromEntries(workOrderCustomFields.map(({ key, value }) => [key, value])),
    items,
    charges,
    tax: tax.round(2).toString(),
    subtotal: subtotal.round(2).toString(),
    total: total.round(2).toString(),
  };
}

async function getWorkOrderInfo(shop: string, workOrderName: string) {
  const [workOrder] = await db.workOrder.get({ shop, name: workOrderName });

  if (!workOrder) {
    throw new HttpError('Work order not found', 404);
  }

  const [
    workOrderCustomFields,
    workOrderItems,
    workOrderHourlyLabourCharges,
    workOrderFixedPriceLabourCharges,
    shopifyOrders,
  ] = await Promise.all([
    db.workOrder.getCustomFields({ workOrderId: workOrder.id }),
    db.workOrder.getItems({ workOrderId: workOrder.id }),
    db.workOrderCharges.getHourlyLabourCharges({ workOrderId: workOrder.id }),
    db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId: workOrder.id }),
    db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId: workOrder.id }),
  ]);

  const [shopifyOrderLineItems, [customer = never('no customer')]] = await Promise.all([
    Promise.all(shopifyOrders.map(order => db.shopifyOrder.getLineItems({ orderId: order.orderId }))).then(result =>
      result.flat(),
    ),
    db.customers.get({ customerId: workOrder.customerId }),
  ]);

  const shopifyOrderLineItemIds = shopifyOrderLineItems.map(lineItem => lineItem.lineItemId);
  const productVariantIds = unique(workOrderItems.map(item => item.productVariantId));
  const [purchaseOrderLineItems, productVariants] = await Promise.all([
    shopifyOrderLineItemIds.length
      ? db.purchaseOrder.getPurchaseOrderLineItemsByShopifyOrderLineItemIds({ shopifyOrderLineItemIds })
      : [],
    productVariantIds.length ? db.productVariants.getMany({ productVariantIds }) : [],
  ]);

  const purchaseOrderIds = unique(purchaseOrderLineItems.map(lineItem => lineItem.purchaseOrderId));
  const productIds = unique(productVariants.map(pv => pv.productId));
  const [purchaseOrders, products] = await Promise.all([
    purchaseOrderIds.length ? db.purchaseOrder.getMany({ purchaseOrderIds }) : [],
    productIds.length ? db.products.getMany({ productIds }) : [],
  ]);

  const shopifyOrderNames = shopifyOrders.filter(hasPropertyValue('orderType', 'ORDER')).map(order => order.name);
  const purchaseOrderNames = purchaseOrders.map(order => order.name);

  const shopifyOrderLineItemsByLineItemId = indexBy(shopifyOrderLineItems, so => so.lineItemId);
  const purchaseOrderLineItemByShopifyLineItemId = indexBy(
    purchaseOrderLineItems.filter(hasNonNullableProperty('shopifyOrderLineItemId')),
    li => li.shopifyOrderLineItemId?.toString() ?? never('just checked this'),
  );
  const shopifyOrderLineItemById = indexBy(shopifyOrderLineItems, so => so.lineItemId);
  const purchaseOrderById = indexBy(purchaseOrders, po => po.id.toString());
  const shopifyOrdersByOrderId = indexBy(shopifyOrders, so => so.orderId);
  const productVariantsById = indexBy(productVariants, pv => pv.productVariantId);
  const productsById = indexBy(products, p => p.productId);

  return {
    shopifyOrderNames,
    purchaseOrderNames,
    customer,
    shopifyOrderLineItemsByLineItemId,
    purchaseOrderLineItemByShopifyLineItemId,
    purchaseOrderById,
    shopifyOrdersByOrderId,
    productVariantsById,
    productsById,
    workOrderCustomFields,
    workOrderItems,
    workOrderHourlyLabourCharges,
    workOrderFixedPriceLabourCharges,
    status: workOrder.status,
    shopifyOrderLineItemById,
  };
}

export type WorkOrderTemplateData = {
  name: string;
  status: string;
  /**
   * Date provided/formatted by clients.
   */
  date: string;
  shopifyOrderNames: string[];
  purchaseOrderNames: string[];
  customFields: Record<string, string>;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  items: WorkOrderTemplateItem[];
  /**
   * Charges not connected to a specific item.
   */
  charges: WorkOrderTemplateCharge[];
  subtotal: string;
  total: string;
  tax: string;
};

type WorkOrderTemplateItem = {
  name: string;
  description: string;
  sku: string | null;
  shopifyOrderName: string | null;
  purchaseOrderName: string | null;
  quantity: number;
  // TODO: Change this to purchaseOrderQuantities: { orderedQuantity: number; availableQuantity: number; } since a work order item can have multiple purchase order line items
  purchaseOrderLineItem: WorkOrderTemplatePurchaseOrderLineItem | null;
  /**
   * Includes charges
   */
  originalUnitPrice: string;
  /**
   * Includes charges
   */
  discountedUnitPrice: string;
  /**
   * Includes charges
   */
  originalTotalPrice: string;
  /**
   * Includes charges
   */
  discountedTotalPrice: string;
  /**
   * Includes charges
   */
  paid: boolean;
  charges: WorkOrderTemplateCharge[];
};

type WorkOrderTemplatePurchaseOrderLineItem = {
  /**
   * Quantity in the purchase order
   */
  quantity: number;
  /**
   * Quantity that has arrived/is now available/in stock
   */
  availableQuantity: number;
};

type WorkOrderTemplateCharge = {
  name: string;
  shopifyOrderName: string | null;
  /**
   * Includes charge-specific information, e.g. hours worked and rate in case of hourly charges.
   */
  details: string;
  totalPrice: string;
  paid: boolean;
};

function assertShopifyOrderLineItemIdIsSet(thing: {
  shopifyOrderLineItemId: string | null;
}): asserts thing is { shopifyOrderLineItemId: string } {
  if (!thing.shopifyOrderLineItemId) {
    // this should always be set, either to an order line item or a draft order line item.
    // this is required to be able to fetch the price.
    // it is possible for it to be undefined when the merchant manually deletes a (draft) order.
    // a webhook will automatically re-create a draft order, but there is a small window where the order is not yet created.
    throw new HttpError(`This work order is not ready to be printed. Try again or re-save the work order.`, 500);
  }
}

function getHourlyChargePrice(hourlyCharge: IGetHourlyLabourChargesResult) {
  const rate = BigDecimal.fromString(hourlyCharge.rate);
  const hours = BigDecimal.fromString(hourlyCharge.hours);

  return rate.multiply(hours).round(2, RoundingMode.CEILING).toString();
}

function getFixedPriceChargePrice(fixedPriceCharge: IGetFixedPriceLabourChargesResult) {
  const amount = BigDecimal.fromString(fixedPriceCharge.amount);
  return amount.round(2, RoundingMode.CEILING).toString();
}
