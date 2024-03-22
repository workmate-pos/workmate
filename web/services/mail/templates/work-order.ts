import { Liquid } from 'liquidjs';
import { db } from '../../db/db.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { groupBy, indexBy, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { BigDecimal, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import {
  IGetFixedPriceLabourChargesResult,
  IGetHourlyLabourChargesResult,
} from '../../db/queries/generated/work-order-charges.sql.js';
import { ShopSettings } from '../../../schemas/generated/shop-settings.js';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { calculateDraftOrder } from '../../work-orders/calculate.js';
import { Session } from '@shopify/shopify-api';

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
  session: Session,
  workOrderName: string,
  clientDate: string,
): Promise<WorkOrderTemplateData> {
  // TODO: Let calculatedraftorder carry the majority of this function. Make it support individual item/charge prices and just fetch the remaining details here
  const { paid, outstanding } = await calculateDraftOrder(session, {
    name: workOrderName,
    charges: [],
    items: [],
    customerId: null,
  });

  const {
    shopifyOrderLineItemsByLineItemId,
    shopifyOrdersByOrderId,
    workOrderItems,
    productVariantsById,
    productsById,
    purchaseOrderLineItemsByShopifyLineItemId,
    purchaseOrderById,
    workOrderHourlyLabourCharges,
    workOrderFixedPriceLabourCharges,
    workOrderCustomFields,
    customer,
    purchaseOrderNames,
    shopifyOrderNames,
    status,
    shopifyOrderLineItemById,
    employeeById,
  } = await getWorkOrderInfo(session.shop, workOrderName);

  function getHourlyLabourChargeData(hourlyCharge: IGetHourlyLabourChargesResult): WorkOrderTemplateCharge {
    assertShopifyOrderLineItemIdIsSet(hourlyCharge);

    const shopifyOrderLineItem =
      shopifyOrderLineItemsByLineItemId[hourlyCharge.shopifyOrderLineItemId] ?? never('hlc no sli');
    const shopifyOrder = shopifyOrdersByOrderId[shopifyOrderLineItem.orderId] ?? never('hlc sli no so');

    let details = `${hourlyCharge.hours} hours × ${hourlyCharge.rate}`;

    const employee = hourlyCharge.employeeId ? employeeById[hourlyCharge.employeeId] ?? never() : null;
    if (employee) {
      details = `${details} (${employee.name})`;
    }

    return {
      name: hourlyCharge.name,
      fullyPaid: shopifyOrder.fullyPaid,
      totalPrice: getHourlyChargePrice(hourlyCharge),
      details,
      shopifyOrderName: shopifyOrder?.orderType === 'ORDER' ? shopifyOrder.name : null,
    };
  }

  function getFixedLabourChargeData(fixedPriceCharge: IGetFixedPriceLabourChargesResult): WorkOrderTemplateCharge {
    assertShopifyOrderLineItemIdIsSet(fixedPriceCharge);

    const shopifyOrderLineItem =
      shopifyOrderLineItemsByLineItemId[fixedPriceCharge.shopifyOrderLineItemId] ?? never('flc no sli');
    const shopifyOrder = shopifyOrdersByOrderId[shopifyOrderLineItem.orderId] ?? never('flc no so');

    let details = `${fixedPriceCharge.amount}`;

    const employee = fixedPriceCharge.employeeId ? employeeById[fixedPriceCharge.employeeId] ?? never() : null;
    if (employee) {
      details = `${details} (${employee.name})`;
    }

    return {
      name: fixedPriceCharge.name,
      fullyPaid: shopifyOrder.fullyPaid,
      totalPrice: getFixedPriceChargePrice(fixedPriceCharge),
      details,
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

    const purchaseOrderLineItems = purchaseOrderLineItemsByShopifyLineItemId[item.shopifyOrderLineItemId] ?? [];
    const purchaseOrderIds = unique(purchaseOrderLineItems.map(poli => poli.purchaseOrderId));
    const purchaseOrders = purchaseOrderIds.map(id => purchaseOrderById[id] ?? never('should have been fetched'));

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
      purchaseOrderNames: purchaseOrders.map(po => po.name),
      shopifyOrderName: shopifyOrder?.name ?? null,
      quantity: item.quantity,
      purchaseOrderQuantities: {
        orderedQuantity: purchaseOrderLineItems.reduce((a, b) => a + b.quantity, 0),
        availableQuantity: purchaseOrderLineItems.reduce((a, b) => a + b.availableQuantity, 0),
      },
      fullyPaid: shopifyOrder.fullyPaid && charges.every(charge => charge.fullyPaid),
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
    fullyPaid: BigDecimal.fromMoney(outstanding).compare(BigDecimal.ZERO) <= 0,
    paid,
    outstanding,
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

  const employeeIds = unique([
    ...workOrderHourlyLabourCharges.map(charge => charge.employeeId).filter(isNonNullable),
    ...workOrderFixedPriceLabourCharges.map(charge => charge.employeeId).filter(isNonNullable),
  ]);

  const [shopifyOrderLineItems, [customer = never('no customer')], employees] = await Promise.all([
    Promise.all(shopifyOrders.map(order => db.shopifyOrder.getLineItems({ orderId: order.orderId }))).then(result =>
      result.flat(),
    ),
    db.customers.get({ customerId: workOrder.customerId }),
    employeeIds.length ? db.employee.getMany({ employeeIds }) : [],
  ]);

  const employeeById = indexBy(employees, e => e.staffMemberId);

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
  const purchaseOrderLineItemsByShopifyLineItemId = groupBy(
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
    employeeById,
    customer,
    shopifyOrderLineItemsByLineItemId,
    purchaseOrderLineItemsByShopifyLineItemId,
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
  outstanding: string;
  paid: string;
  tax: string;
  fullyPaid: boolean;
};

type WorkOrderTemplateItem = {
  name: string;
  description: string;
  sku: string | null;
  shopifyOrderName: string | null;
  purchaseOrderNames: string[];
  quantity: number;
  purchaseOrderQuantities: {
    orderedQuantity: number;
    availableQuantity: number;
  };
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
  fullyPaid: boolean;
  charges: WorkOrderTemplateCharge[];
};

type WorkOrderTemplateCharge = {
  name: string;
  shopifyOrderName: string | null;
  /**
   * Includes charge-specific information, e.g. hours worked and rate in case of hourly charges.
   */
  details: string;
  totalPrice: string;
  fullyPaid: boolean;
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
