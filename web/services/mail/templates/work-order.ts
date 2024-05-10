import { Liquid } from 'liquidjs';
import { db } from '../../db/db.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { indexBy, sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { BigDecimal, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { ShopSettings } from '../../../schemas/generated/shop-settings.js';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { calculateWorkOrder } from '../../work-orders/calculate.js';
import { Session } from '@shopify/shopify-api';
import { getWorkOrder } from '../../work-orders/get.js';
import { WorkOrderCharge } from '../../work-orders/types.js';
import { subtractMoney } from '../../../util/money.js';

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
  clientDueDate: string,
): Promise<WorkOrderTemplateData> {
  const workOrder = await getWorkOrder(session, workOrderName);

  if (!workOrder) {
    throw new HttpError(`Work order ${workOrderName} not found`, 404);
  }

  const productVariantIds = unique(workOrder.items.map(item => item.productVariantId));
  const orderIds = unique(workOrder.items.map(item => item.shopifyOrderLineItem?.orderId).filter(isNonNullable));

  const [
    [customer = never('fk')],
    [productVariants, products],
    orders,
    {
      outstanding,
      total,
      subtotal,
      tax,
      orderDiscount,
      itemPrices,
      fixedPriceLabourChargePrices,
      hourlyLabourChargePrices,
    },
  ] = await Promise.all([
    db.customers.get({ customerId: workOrder.customerId }),
    productVariantIds.length
      ? db.productVariants.getMany({ productVariantIds }).then(productVariants => {
          const productIds = unique(productVariants.map(pv => pv.productId));
          return Promise.all([productVariants, productIds.length ? db.products.getMany({ productIds }) : []]);
        })
      : [[], []],
    orderIds.length ? db.shopifyOrder.getMany({ orderIds }) : [],
    calculateWorkOrder(session, workOrder),
  ]);

  const paid = subtractMoney(total, outstanding);

  const productById = indexBy(products, p => p.productId);
  const productVariantById = indexBy(productVariants, pv => pv.productVariantId);
  const orderById = indexBy(orders, o => o.orderId);

  function getChargeTemplateData(charge: WorkOrderCharge): WorkOrderTemplateCharge {
    const orderId = charge.shopifyOrderLineItem?.orderId;
    const order = orderId ? orderById[orderId] ?? never('fk') : null;

    const priceRecord = {
      'fixed-price-labour': fixedPriceLabourChargePrices,
      'hourly-labour': hourlyLabourChargePrices,
    }[charge.type];

    const totalPrice = priceRecord[charge.uuid] ?? never('calculate wrong?');

    let details = '';

    if (charge.type === 'hourly-labour') {
      details = `${charge.hours} hours × $${charge.rate}`;
    } else if (charge.type === 'fixed-price-labour') {
      details = `$${charge.amount}`;
    } else {
      return charge satisfies never;
    }

    return {
      name: charge.name,
      fullyPaid: order?.fullyPaid ?? false,
      shopifyOrderName: order?.name ?? null,
      totalPrice: round(totalPrice),
      details,
    };
  }

  return {
    name: workOrder.name,
    status: workOrder.status,
    date: clientDate,
    dueDate: clientDueDate,
    shopifyOrderNames: workOrder.orders.filter(hasPropertyValue('type', 'ORDER')).map(order => order.name),
    purchaseOrderNames: unique(workOrder.items.flatMap(item => item.purchaseOrders.map(po => po.name))),
    customer: {
      name: customer.displayName,
      address: customer.address,
      email: customer.email,
      phone: customer.phone,
    },
    note: workOrder.note,
    hiddenNote: workOrder.internalNote,
    customFields: workOrder.customFields,
    items: workOrder.items.map<WorkOrderTemplateItem>(item => {
      const productVariant = productVariantById[item.productVariantId] ?? never('product variant fk');
      const product = productById[productVariant.productId] ?? never('product fk');
      const name =
        getProductVariantName({
          title: productVariant.title,
          product: { title: product.title, hasOnlyDefaultVariant: product.productVariantCount === 1 },
        }) ?? never('no pv name');

      const orderId = item.shopifyOrderLineItem?.orderId;
      const order = orderId ? orderById[orderId] ?? never('fk') : null;

      const purchaseOrderNames = item.purchaseOrders.map(po => po.name);

      const totalPrice = itemPrices[item.uuid] ?? never('smth wrong with calculate');
      const unitPrice = (() => {
        if (item.quantity === 0) return totalPrice;
        return BigDecimal.fromMoney(totalPrice)
          .divide(BigDecimal.fromString(item.quantity.toFixed(0)))
          .round(2, RoundingMode.CEILING)
          .toMoney();
      })();

      return {
        name,
        charges: workOrder.charges.filter(hasPropertyValue('workOrderItemUuid', item.uuid)).map(getChargeTemplateData),
        sku: productVariant.sku,
        fullyPaid: order?.fullyPaid ?? false,
        shopifyOrderName: order?.name ?? null,
        purchaseOrderNames,
        purchaseOrderQuantities: {
          orderedQuantity: sum(item.purchaseOrders.flatMap(po => po.items.map(item => item.quantity))),
          availableQuantity: sum(item.purchaseOrders.flatMap(po => po.items.map(item => item.availableQuantity))),
        },
        quantity: item.quantity,
        description: product.description,
        totalPrice: round(totalPrice),
        unitPrice: round(unitPrice),
      };
    }),
    charges: workOrder.charges.filter(hasPropertyValue('workOrderItemUuid', null)).map(getChargeTemplateData),
    fullyPaid: orders.every(order => order.fullyPaid),
    outstanding: round(outstanding),
    paid: round(paid),
    total: round(total),
    subtotal: round(subtotal),
    tax: round(tax),
    discount: round(orderDiscount.total),
  };
}

export type WorkOrderTemplateData = {
  name: string;
  status: string;
  note: string;
  hiddenNote: string;
  /**
   * Date provided/formatted by clients.
   */
  date: string;
  dueDate: string;
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
  discount: string;
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
  unitPrice: string;
  totalPrice: string;
  /**
   * Does not include charges
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

function round(amount: string) {
  return BigDecimal.fromString(amount).round(2, RoundingMode.CEILING).toMoney();
}
