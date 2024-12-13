import { Liquid } from 'liquidjs';
import { db } from '../../db/db.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { BigDecimal, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { calculateWorkOrder } from '../../work-orders/calculate.js';
import { Session } from '@shopify/shopify-api';
import { getDetailedWorkOrder } from '../../work-orders/get.js';
import { DetailedWorkOrderCharge } from '../../work-orders/types.js';
import { subtractMoney } from '../../../util/money.js';
import { ShopSettings } from '../../settings/schema.js';
import { LocalsTeifiUser } from '../../../decorators/permission.js';

export async function getRenderedWorkOrderTemplate(
  printTemplate: ShopSettings['workOrders']['printTemplates'][string],
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
  user: LocalsTeifiUser,
): Promise<WorkOrderTemplateData> {
  const workOrder = await getDetailedWorkOrder(session, workOrderName, user.user.allowedLocationIds);

  if (!workOrder) {
    throw new HttpError(`Work order ${workOrderName} not found`, 404);
  }

  const [
    [customer = never('fk')],
    {
      outstanding,
      total,
      subtotal,
      tax,
      orderDiscount,
      itemPrices,
      chargePrices,
      itemLineItemIds,
      chargeLineItemIds,
      lineItems,
      missingProductVariantIds,
    },
  ] = await Promise.all([
    db.customers.get({ customerId: workOrder.customerId }),
    calculateWorkOrder(session, workOrder, user, { includeExistingOrders: true }),
  ]);

  const paid = subtractMoney(total, outstanding);

  function getChargeTemplateData(charge: DetailedWorkOrderCharge): WorkOrderTemplateCharge {
    const lineItemId = chargeLineItemIds[charge.uuid];
    const lineItem = lineItems.find(li => li.id === lineItemId);

    const totalPrice = chargePrices[charge.uuid] ?? never('calculate wrong?');

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
      fullyPaid: lineItem?.order?.fullyPaid ?? false,
      shopifyOrderName: lineItem?.order?.name ?? null,
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
    purchaseOrderNames: unique(
      workOrder.items
        .filter(hasPropertyValue('type', 'product'))
        .flatMap(item => item.purchaseOrders.map(po => po.name)),
    ),
    customer: {
      name: customer.displayName,
      address: customer.address,
      email: customer.email,
      phone: customer.phone,
    },
    note: workOrder.note,
    hiddenNote: workOrder.internalNote,
    customFields: workOrder.customFields,
    items: workOrder.items
      .filter(item => item.type !== 'product' || !missingProductVariantIds.includes(item.productVariantId))
      .map<WorkOrderTemplateItem>(item => {
        const {
          lineItemId,
          totalPrice = never('smth wrong with calculate'),
          purchaseOrders,
        } = {
          totalPrice: itemPrices[item.uuid],
          lineItemId: itemLineItemIds[item.uuid],
          purchaseOrders: item.type === 'product' ? item.purchaseOrders : [],
        };

        const lineItem = lineItems.find(li => li.id === lineItemId) ?? null;

        const purchaseOrderNames = purchaseOrders.map(po => po.name);

        const unitPrice = (() => {
          if (item.quantity === 0) return totalPrice;
          return BigDecimal.fromMoney(totalPrice)
            .divide(BigDecimal.fromString(item.quantity.toFixed(0)))
            .round(2, RoundingMode.CEILING)
            .toMoney();
        })();

        return {
          name: lineItem?.name ?? 'Unknown product',
          charges: workOrder.charges
            .filter(hasPropertyValue('workOrderItemUuid', item.uuid))
            .map(getChargeTemplateData),
          sku: lineItem?.sku ?? null,
          fullyPaid: lineItem?.order?.fullyPaid ?? false,
          shopifyOrderName: lineItem?.order?.name ?? null,
          purchaseOrderNames,
          purchaseOrderQuantities: {
            orderedQuantity: sum(purchaseOrders.flatMap(po => po.items.map(item => item.quantity))),
            availableQuantity: sum(purchaseOrders.flatMap(po => po.items.map(item => item.availableQuantity))),
          },
          quantity: item.quantity,
          description: lineItem?.variant?.product?.description ?? '',
          totalPrice: round(totalPrice),
          unitPrice: round(unitPrice),
          customFields: item.customFields,
        };
      }),
    charges: workOrder.charges.filter(hasPropertyValue('workOrderItemUuid', null)).map(getChargeTemplateData),
    fullyPaid: lineItems.every(lineItem => lineItem.order?.fullyPaid ?? false),
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
  customFields: Record<string, string>;
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
