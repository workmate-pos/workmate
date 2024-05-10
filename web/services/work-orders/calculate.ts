import { Session } from '@shopify/shopify-api';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { fetchAllPages, gql } from '../gql/gql.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import {
  getChargeUnitPrice,
  getCustomAttributeArrayFromObject,
  getUuidsFromCustomAttributes,
  getWorkOrderLineItems,
} from '@work-orders/work-order-shopify-order';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getShopSettings } from '../settings.js';
import { db } from '../db/db.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { assertGid, ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { BigDecimal, Money, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { decimalToMoney } from '../../util/decimal.js';
import {
  addMoney,
  compareMoney,
  divideMoney,
  maxMoney,
  roundMoney,
  subtractMoney,
  ZERO_MONEY,
} from '../../util/money.js';
import { IGetItemsResult } from '../db/queries/generated/work-order.sql.js';
import {
  IGetFixedPriceLabourChargesResult,
  IGetHourlyLabourChargesResult,
} from '../db/queries/generated/work-order-charges.sql.js';
import { getMissingNonPaidWorkOrderProduct, validateCalculateWorkOrder } from './validate.js';
import { v4 as uuid } from 'uuid';

// TODO: Include line item information to show in POS
type CalculateWorkOrderResult = {
  outstanding: Money;
  orderDiscount: {
    applied: Money;
    total: Money;
  };
  lineItemDiscount: {
    applied: Money;
    total: Money;
  };
  subtotal: Money;
  total: Money;
  tax: Money;
  itemPrices: Record<string, Money>;
  hourlyLabourChargePrices: Record<string, Money>;
  fixedPriceLabourChargePrices: Record<string, Money>;
  itemLineItems: Record<string, unknown>;
  missingProductVariantIds: ID[];
  warnings: string[];
};

/**
 * Calculates the price of a work order on a per-item/charge + overall basis.
 *
 * Uses existing orders when present, but uses the `draftOrderCalculate` mutation otherwise.
 * Also includes product/line item information to support deleted products.
 * Tries to not throw, but to instead send an error along with a semi-correct result (e.g. in case there are missing products/deleted orders).
 */
export async function calculateWorkOrder(
  session: Session,
  calculateWorkOrder: CalculateWorkOrder,
): Promise<CalculateWorkOrderResult> {
  await validateCalculateWorkOrder(session, calculateWorkOrder, true);

  const { shop } = session;
  const { name } = calculateWorkOrder;
  const graphql = new Graphql(session);

  let tax = ZERO_MONEY;
  let total = ZERO_MONEY;
  let subtotal = ZERO_MONEY;
  let outstanding = ZERO_MONEY;
  let appliedOrderDiscount = ZERO_MONEY;
  let totalOrderDiscount = ZERO_MONEY;
  let appliedLineItemDiscount = ZERO_MONEY;
  let totalLineItemDiscount = ZERO_MONEY;
  const missingProductVariantIds = await getMissingNonPaidWorkOrderProduct(session, calculateWorkOrder);
  const itemPrices: Record<string, Money> = {};
  const itemLineItems: Record<string, unknown> = {};
  const hourlyLabourChargePrices: Record<string, Money> = {};
  const fixedPriceLabourChargePrices: Record<string, Money> = {};

  const warnings: string[] = [];

  // All orders involved in the WO, including all their line items. These will be processed to compute everything.
  const orders: (OrderWithAllLineItems | CalculatedDraftOrderWithFakeIds)[] = [];

  const items: Pick<IGetItemsResult, 'shopifyOrderLineItemId' | 'uuid' | 'quantity' | 'absorbCharges'>[] = [];
  const hourlyCharges: Pick<IGetHourlyLabourChargesResult, 'shopifyOrderLineItemId' | 'uuid' | 'hours' | 'rate'>[] = [];
  const fixedPriceLabourCharges: Pick<
    IGetFixedPriceLabourChargesResult,
    'shopifyOrderLineItemId' | 'uuid' | 'amount'
  >[] = [];

  // fetch all existing orders for this WO if it is not a new WO.
  if (name) {
    const [workOrder] = await db.workOrder.get({ shop, name });

    if (!workOrder) {
      throw new HttpError('Work order not found', 404);
    }

    const { id: workOrderId } = workOrder;

    const [databaseItems, databaseHourlyCharges, databaseFixedCharges] = await Promise.all([
      db.workOrder.getItems({ workOrderId }),
      db.workOrderCharges.getHourlyLabourCharges({ workOrderId }),
      db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId }),
    ]);

    const lineItemIds = unique(
      [...databaseItems, ...databaseHourlyCharges, ...databaseFixedCharges]
        .map(item => item.shopifyOrderLineItemId)
        .filter(isLineItemId),
    );

    const lineItems = lineItemIds.length ? await db.shopifyOrder.getLineItemsByIds({ lineItemIds }) : [];

    const orderIds = unique(
      lineItems.map(lineItem => {
        assertGid(lineItem.orderId);
        return lineItem.orderId;
      }),
    );

    const existingOrders = await getOrdersWithAllLineItems(graphql, orderIds);

    if (existingOrders.length < orderIds.length) {
      warnings.push(
        `${orderIds.length - existingOrders.length} orders were not found - excluding them from price calculations.`,
      );
    }

    // We assume that every order only contains items added to the work order
    // TODO: Automatically add these items to the work order in case this happens
    orders.push(...existingOrders);
  }

  const draftOrder = await getCalculatedDraftOrderWithFakeIds(session, {
    ...calculateWorkOrder,
    // do not include any items/charges that are already paid for/in a real order
    items: calculateWorkOrder.items
      .filter(item => !items.some(hasPropertyValue('uuid', item.uuid)))
      .filter(item => !missingProductVariantIds.includes(item.productVariantId)),
    charges: calculateWorkOrder.charges.filter(charge => {
      if (charge.type === 'hourly-labour') {
        return !hourlyCharges.some(hasPropertyValue('uuid', charge.uuid));
      }

      if (charge.type === 'fixed-price-labour') {
        return !fixedPriceLabourCharges.some(hasPropertyValue('uuid', charge.uuid));
      }

      return charge satisfies never;
    }),
  });

  if (draftOrder) {
    orders.push(draftOrder);
  }

  for (const item of calculateWorkOrder.items) {
    if (items.some(hasPropertyValue('uuid', item.uuid))) {
      continue;
    }

    items.push({
      uuid: item.uuid,
      quantity: item.quantity,
      // We use a fake shopifyOrderLineItemId because draftOrderCalculate does not generate one!
      shopifyOrderLineItemId: getItemCalculatedDraftLineItemGid(item),
      absorbCharges: item.absorbCharges,
    });
  }

  for (const charge of calculateWorkOrder.charges) {
    let shopifyOrderLineItemId = getChargeCalculatedDraftLineItemGid(charge);

    if (charge.workOrderItemUuid) {
      const item =
        items.find(i => i.uuid === charge.workOrderItemUuid) ?? never('should have been verified by assertions');

      if (item.absorbCharges) {
        shopifyOrderLineItemId = getItemCalculatedDraftLineItemGid(item);
      }
    }

    if (charge.type === 'hourly-labour') {
      hourlyCharges.push({
        uuid: charge.uuid,
        shopifyOrderLineItemId,
        hours: charge.hours,
        rate: charge.rate,
      });
    } else if (charge.type === 'fixed-price-labour') {
      fixedPriceLabourCharges.push({
        uuid: charge.uuid,
        shopifyOrderLineItemId,
        amount: charge.amount,
      });
    } else {
      return charge satisfies never;
    }
  }

  for (const order of orders) {
    tax = addMoney(tax, decimalToMoney(order.currentTotalTaxSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal()));
    total = addMoney(
      total,
      decimalToMoney(order.currentTotalPriceSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal()),
    );
    subtotal = addMoney(
      subtotal,
      decimalToMoney(order.currentSubtotalPriceSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal()),
    );

    if (order.__typename === 'Order') {
      outstanding = addMoney(
        outstanding,
        decimalToMoney(order.totalOutstandingSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal()),
      );

      const orderDiscount = decimalToMoney(
        order.currentTotalDiscountsSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal(),
      );

      appliedOrderDiscount = addMoney(appliedOrderDiscount, orderDiscount);
      totalOrderDiscount = addMoney(totalOrderDiscount, orderDiscount);
    } else {
      outstanding = addMoney(
        outstanding,
        decimalToMoney(order.currentTotalPriceSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal()),
      );
      totalOrderDiscount = addMoney(
        totalOrderDiscount,
        decimalToMoney(order.appliedDiscount?.amountSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal()),
      );
    }

    for (const lineItem of order.lineItems) {
      const discountedTotal = decimalToMoney(lineItem.discountedTotalSet.shopMoney.amount);
      const originalTotal = decimalToMoney(lineItem.originalTotalSet.shopMoney.amount);

      const lineItemDiscount = subtractMoney(originalTotal, discountedTotal);

      totalLineItemDiscount = addMoney(totalLineItemDiscount, lineItemDiscount);

      if (order.__typename === 'Order') {
        appliedLineItemDiscount = addMoney(appliedLineItemDiscount, lineItemDiscount);
      }

      // next, we determine the price of every thing contained in this line item (items, charges, etc)

      const lineItemItems = items.filter(hasPropertyValue('shopifyOrderLineItemId', lineItem.id));
      const lineItemHourlyCharges = hourlyCharges.filter(hasPropertyValue('shopifyOrderLineItemId', lineItem.id));
      const lineItemFixedCharges = fixedPriceLabourCharges.filter(
        hasPropertyValue('shopifyOrderLineItemId', lineItem.id),
      );

      // if the line item is discounted, we apply the same discount % on every contained item/charge
      const discountFactor = (() => {
        if (compareMoney(decimalToMoney(lineItem.discountedTotalSet.shopMoney.amount), ZERO_MONEY) === 0)
          return BigDecimal.ONE;
        return BigDecimal.fromMoney(divideMoney(discountedTotal, originalTotal));
      })();

      // 1) determine the price of charges
      let remainingLineItemPrice = discountedTotal;

      for (const [charges, chargePriceRecord] of [
        [lineItemHourlyCharges, hourlyLabourChargePrices],
        [lineItemFixedCharges, fixedPriceLabourChargePrices],
      ] as const) {
        for (const charge of charges) {
          const originalChargeTotal = BigDecimal.fromMoney(getChargeUnitPrice(charge));
          const discountedChargeTotal = originalChargeTotal.multiply(discountFactor).round(2, RoundingMode.CEILING);

          chargePriceRecord[charge.uuid] = discountedChargeTotal.toMoney();

          remainingLineItemPrice = subtractMoney(remainingLineItemPrice, discountedChargeTotal.toMoney());
        }
      }

      remainingLineItemPrice = roundMoney(remainingLineItemPrice, 2, RoundingMode.CEILING);
      remainingLineItemPrice = maxMoney(remainingLineItemPrice, ZERO_MONEY);

      // 2) the remainder goes to the items (distributed by quantity)
      let remainingItemQuantity = sum(lineItemItems.map(li => li.quantity));

      for (const [i, item] of lineItemItems.entries()) {
        let divideQuantity = remainingItemQuantity;

        if (divideQuantity === 0) {
          // it is possible for mutable services to be stored as having a quantity of 0 (their quantity is not used for anything)
          // in this case, divide evenly based on the number of remaining items
          divideQuantity = lineItemItems.length - i;
        }

        let itemPrice = divideMoney(remainingLineItemPrice, BigDecimal.fromString(divideQuantity.toFixed(0)).toMoney());

        itemPrice = roundMoney(itemPrice, 2, RoundingMode.FLOOR);

        itemPrices[item.uuid] = itemPrice;
        remainingItemQuantity -= item.quantity;
        remainingLineItemPrice = subtractMoney(remainingLineItemPrice, itemPrice);
      }
    }
  }

  return {
    tax,
    total,
    subtotal,
    outstanding,

    // TODO: Fix
    // total = applied, because we are working with real orders (non-draft)
    orderDiscount: { total: totalOrderDiscount, applied: totalOrderDiscount },
    lineItemDiscount: { total: totalLineItemDiscount, applied: totalLineItemDiscount },

    missingProductVariantIds,
    itemPrices,
    itemLineItems,
    hourlyLabourChargePrices,
    fixedPriceLabourChargePrices,

    warnings,
  };
}

function getItemCalculatedDraftLineItemGid(item: { uuid: string }) {
  return `gid://shopify/CalculatedDraftLineItem/item-${item.uuid}`;
}

function getChargeCalculatedDraftLineItemGid(charge: { type: string; uuid: string }) {
  return `gid://shopify/CalculatedDraftLineItem/${charge.type}-${charge.uuid}`;
}

type CalculatedDraftOrderWithFakeIds = NonNullable<Awaited<ReturnType<typeof getCalculatedDraftOrderWithFakeIds>>>;

/**
 * draftOrderCalculate does not generate a line item id for items that are already in an order.
 * To make line items identifiable we add fake ids to line items to make them identifiable.
 */
async function getCalculatedDraftOrderWithFakeIds(session: Session, calculateWorkOrder: CalculateWorkOrder) {
  const { shop } = session;
  const { labourLineItemSKU } = await getShopSettings(shop);

  const { items, charges, discount } = calculateWorkOrder;

  const hourlyLabourCharges = charges.filter(hasPropertyValue('type', 'hourly-labour'));
  const fixedPriceLabourCharges = charges.filter(hasPropertyValue('type', 'fixed-price-labour'));
  const { lineItems, customSales } = getWorkOrderLineItems(items, hourlyLabourCharges, fixedPriceLabourCharges, {
    labourSku: labourLineItemSKU,
  });

  if (lineItems.length === 0 && customSales.length === 0) {
    return null;
  }

  const graphql = new Graphql(session);
  const result = await gql.calculate.draftOrderCalculate.run(graphql, {
    input: {
      lineItems: [
        ...lineItems.map(lineItem => ({
          variantId: lineItem.productVariantId,
          customAttributes: getCustomAttributeArrayFromObject(lineItem.customAttributes),
          quantity: lineItem.quantity,
        })),
        ...customSales.map(customSale => ({
          title: customSale.title,
          customAttributes: getCustomAttributeArrayFromObject(customSale.customAttributes),
          quantity: customSale.quantity,
          originalUnitPrice: customSale.unitPrice,
          taxable: customSale.taxable,
        })),
      ],
      appliedDiscount: discount ? { value: Number(discount.value), valueType: discount.type } : null,
    },
  });

  if (!result.draftOrderCalculate?.calculatedDraftOrder) {
    throw new HttpError('Calculation failed', 400);
  }

  return {
    ...result.draftOrderCalculate.calculatedDraftOrder,
    lineItems: result.draftOrderCalculate.calculatedDraftOrder.lineItems.map(lineItem => {
      let id: string = `gid://shopify/CalculatedDraftLineItem/${uuid()}`;

      const uuids = getUuidsFromCustomAttributes(lineItem.customAttributes);

      for (const uuid of uuids) {
        if (uuid.type === 'item') {
          id = getItemCalculatedDraftLineItemGid({ uuid: uuid.uuid });
          break;
        }

        id = getChargeCalculatedDraftLineItemGid({ type: uuid.type, uuid: uuid.uuid });
      }

      return {
        ...lineItem,
        id,
      };
    }),
  };
}

type OrderWithAllLineItems = Awaited<ReturnType<typeof getOrdersWithAllLineItems>>[number];

async function getOrdersWithAllLineItems(graphql: Graphql, orderIds: ID[]) {
  const orders = await gql.calculate.getOrders
    .run(graphql, { ids: orderIds })
    .then(result => result.nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'Order')));

  // load any extra line items
  await Promise.all(
    orders.map(async order => {
      if (!order.lineItems.pageInfo.hasNextPage) return;

      const lineItems = await fetchAllPages(
        graphql,
        (graphql, variables) => gql.calculate.getOrderLineItems.run(graphql, { ...variables, id: order.id }),
        result => result.order?.lineItems ?? never('this order definitely exists'),
        order.lineItems.pageInfo.endCursor,
      );

      order.lineItems.pageInfo.hasNextPage = false;
      order.lineItems.pageInfo.endCursor = null;

      order.lineItems.nodes.push(...lineItems);
    }),
  );

  return orders.map(order => ({
    ...order,
    lineItems: order.lineItems.nodes,
  }));
}

function isLineItemId(id: string | null): id is ID {
  return id !== null && parseGid(id).objectName === 'LineItem';
}
