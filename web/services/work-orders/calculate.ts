import { Session } from '@shopify/shopify-api';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import {
  getChargeUnitPrice,
  getCustomAttributeArrayFromObject,
  getWorkOrderAppliedDiscount,
  getWorkOrderLineItems,
} from '@work-orders/work-order-shopify-order';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { getShopSettings } from '../settings.js';
import { db } from '../db/db.js';
import { indexBy, sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { assertGid, createGid, ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertMoney, BigDecimal, Money, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { decimalToMoney } from '../../util/decimal.js';
import { getWorkOrderDepositedAmount, getWorkOrderDepositedReconciledAmount } from './get.js';
import { addMoney, ZERO_MONEY } from '../../util/money.js';
import { IGetDepositsResult, IGetItemsResult } from '../db/queries/generated/work-order.sql.js';
import {
  IGetFixedPriceLabourChargesResult,
  IGetHourlyLabourChargesResult,
} from '../db/queries/generated/work-order-charges.sql.js';
import { getLineItemIdsByUuids } from './link-order-items.js';

type CalculateWorkOrderResult = {
  outstanding: Money;
  paid: Money;
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
  // TODO: Need unit price for items, and discounted and original prices
  itemPrices: Record<string, Money>;
  hourlyLabourChargePrices: Record<string, Money>;
  fixedPriceLabourChargePrices: Record<string, Money>;
  depositPrices: Record<string, Money>;
};

// TODO: Use this for templates

/**
 * Calculates the price of a work order on a per-item/charge basis.
 * This is easy when we do not have any existing orders to account for, since this makes it possible to use the calculateDraftOrder mutation.
 * However, when there are existing orders we must account for any discounts/taxes/etc that have been applied to the order.
 * This results in a calculateDraftOrder mutation for any new items/charges, and database lookups for all existing items/charges.
 *
 * Item/charge prices include any discounts, but exclude taxes, etc.
 * In the case of absorbed charges, the discount is spread across all items/charges for the same line item.
 */
export async function calculateWorkOrder(
  session: Session,
  calculateWorkOrder: CalculateWorkOrder,
): Promise<CalculateWorkOrderResult> {
  const {
    hourlyLabourChargePrices: existingHourlyLabourChargePrices,
    fixedPriceLabourChargePrices: existingFixedPriceLabourChargePrices,
    orderDiscount: existingOrderDiscount,
    lineItemDiscount: existingLineItemDiscount,
    tax: existingTax,
    total: existingTotal,
    paid: existingPaid,
    itemPrices: existingItemPrices,
    subtotal: existingSubtotal,
    outstanding: existingOutstanding,
    depositPrices: existingDepositPrices,
  } = await calculateDatabaseOrders(session, calculateWorkOrder);

  const draftItems = calculateWorkOrder.items.filter(item => !(item.uuid in existingItemPrices));
  const draftCharges = calculateWorkOrder.charges.filter(charge => {
    if (charge.type === 'hourly-labour') {
      return !(charge.uuid in existingHourlyLabourChargePrices);
    }

    if (charge.type === 'fixed-price-labour') {
      return !(charge.uuid in existingFixedPriceLabourChargePrices);
    }

    return charge satisfies never;
  });

  const {
    tax: newTax,
    subtotal: newSubtotal,
    orderDiscount: newOrderDiscount,
    lineItemDiscount: newLineItemDiscount,
    hourlyLabourChargePrices: newHourlyLabourChargePrices,
    fixedPriceLabourChargePrices: newFixedPriceLabourChargePrices,
    itemPrices: newItemPrices,
    total: newTotal,
  } = await calculateDraftOrder(session, {
    name: calculateWorkOrder.name,
    items: draftItems,
    charges: draftCharges,
    discount: calculateWorkOrder.discount,
  });

  return {
    subtotal: addMoney(existingSubtotal, newSubtotal),
    tax: addMoney(existingTax, newTax),
    orderDiscount: {
      total: addMoney(existingOrderDiscount, newOrderDiscount),
      applied: existingOrderDiscount,
    },
    lineItemDiscount: {
      total: addMoney(existingLineItemDiscount, newLineItemDiscount),
      applied: existingLineItemDiscount,
    },
    paid: existingPaid,
    outstanding: addMoney(existingOutstanding, newTotal),
    total: addMoney(existingTotal, newTotal),
    itemPrices: { ...existingItemPrices, ...newItemPrices },
    hourlyLabourChargePrices: { ...existingHourlyLabourChargePrices, ...newHourlyLabourChargePrices },
    fixedPriceLabourChargePrices: { ...existingFixedPriceLabourChargePrices, ...newFixedPriceLabourChargePrices },
    depositPrices: existingDepositPrices,
  };
}

/**
 * Same as calculateDraftOrder, but uses all order line items associated with the work order.
 * Does NOT use draft orders.
 */
async function calculateDatabaseOrders(session: Session, calculateWorkOrder: CalculateWorkOrder) {
  const { shop } = session;
  const { name } = calculateWorkOrder;

  if (!name) {
    return {
      total: ZERO_MONEY,
      tax: ZERO_MONEY,
      subtotal: ZERO_MONEY,
      paid: ZERO_MONEY,
      outstanding: ZERO_MONEY,
      orderDiscount: ZERO_MONEY,
      lineItemDiscount: ZERO_MONEY,
      itemPrices: {},
      fixedPriceLabourChargePrices: {},
      hourlyLabourChargePrices: {},
      depositPrices: {},
    };
  }

  const [workOrder] = await db.workOrder.get({ shop, name });

  if (!workOrder) {
    throw new HttpError('Work order not found', 404);
  }

  const { id: workOrderId } = workOrder;

  const databaseItems = await db.workOrder.getItems({ workOrderId });
  const databaseHourlyCharges = await db.workOrderCharges.getHourlyLabourCharges({ workOrderId });
  const databaseFixedCharges = await db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId });
  const databaseDeposits = await db.workOrder.getDeposits({ workOrderId });

  const lineItemIds = unique(
    [...databaseItems, ...databaseHourlyCharges, ...databaseFixedCharges, ...databaseDeposits]
      .map(item => item.shopifyOrderLineItemId)
      .filter(isLineItemId),
  );

  const lineItems = lineItemIds.length ? await db.shopifyOrder.getLineItemsByIds({ lineItemIds }) : [];

  const orderIds = unique(lineItems.map(lineItem => lineItem.orderId));
  const orders = orderIds.length ? await db.shopifyOrder.getMany({ orderIds }) : [];
  const orderById = indexBy(orders, so => so.orderId);

  return calculateLineItems({
    items: databaseItems,
    lineItems: lineItems.map<LineItem>(lineItem => {
      const order = orderById[lineItem.orderId] ?? never('fk');

      assertGid(lineItem.lineItemId);

      return {
        id: lineItem.lineItemId,
        quantity: lineItem.quantity,
        totalTax: lineItem.totalTax,
        unitPrice: lineItem.unitPrice,
        discountedUnitPrice: lineItem.discountedUnitPrice,
        order: {
          subtotal: order.subtotal,
          discount: order.discount,
          total: order.total,
          outstanding: order.outstanding,
        },
      };
    }),
    hourlyCharges: databaseHourlyCharges,
    fixedPriceLabourCharges: databaseFixedCharges,
    deposits: databaseDeposits,
  });
}

/**
 * Similar to {@link calculateDatabaseOrders}, but instead uses the `calculateDraftOrder` mutation
 * to calculate the price of any items/charges that are not in the database.
 */
async function calculateDraftOrder(
  session: Session,
  { name, items, charges, discount }: Pick<CalculateWorkOrder, 'name' | 'items' | 'charges' | 'discount'>,
) {
  if (items.length === 0 && charges.length === 0) {
    return {
      total: ZERO_MONEY,
      tax: ZERO_MONEY,
      subtotal: ZERO_MONEY,
      orderDiscount: ZERO_MONEY,
      lineItemDiscount: ZERO_MONEY,
      itemPrices: {},
      fixedPriceLabourChargePrices: {},
      hourlyLabourChargePrices: {},
    };
  }

  const { shop } = session;
  const { labourLineItemSKU } = await getShopSettings(shop);

  const hourlyLabourCharges = charges.filter(hasPropertyValue('type', 'hourly-labour'));
  const fixedPriceLabourCharges = charges.filter(hasPropertyValue('type', 'fixed-price-labour'));
  const { lineItems, customSales } = getWorkOrderLineItems(items, hourlyLabourCharges, fixedPriceLabourCharges, {
    labourSku: labourLineItemSKU,
  });

  const [workOrder] = name ? await db.workOrder.get({ name }) : [];

  const deposit = workOrder
    ? {
        depositedAmount: await getWorkOrderDepositedAmount(workOrder.id),
        depositedReconciledAmount: await getWorkOrderDepositedReconciledAmount(workOrder.id),
      }
    : { depositedAmount: ZERO_MONEY, depositedReconciledAmount: ZERO_MONEY };

  const graphql = new Graphql(session);

  const result = await gql.draftOrder.calculate
    .run(graphql, {
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
        appliedDiscount: getWorkOrderAppliedDiscount(discount, deposit),
      },
    })
    .then(r => r.draftOrderCalculate);

  if (!result?.calculatedDraftOrder) {
    throw new HttpError('Calculation failed', 500);
  }

  // now that we have calculated, we map line items to items/charges and do calculation as normal

  const {
    lineItems: baseCalculatedLineItems,
    totalTaxSet,
    totalPriceSet,
    subtotalPriceSet,
    appliedDiscount,
  } = result.calculatedDraftOrder;

  // calculateDraftOrder does not do line-item-level tax, so we just divide the total tax uniformly over all taxable line items
  let totalTaxable = BigDecimal.sum(
    ...baseCalculatedLineItems
      .filter(li => li.taxable)
      .map(li =>
        BigDecimal.fromDecimal(li.discountedUnitPriceSet.shopMoney.amount).multiply(
          BigDecimal.fromString(li.quantity.toFixed(0)),
        ),
      ),
  );
  let remainingTax = BigDecimal.fromDecimal(totalTaxSet.shopMoney.amount);

  const calculatedLineItems = baseCalculatedLineItems.map((li, i) => ({
    // attach a fake ID so we can reuse calculateLineItems :^)
    id: createGid('CalculateDraftOrderLineItem', i),
    totalTax: (() => {
      if (!li.taxable) return ZERO_MONEY;
      if (totalTaxable.equals(BigDecimal.ZERO)) return ZERO_MONEY;

      const lineItemPrice = BigDecimal.fromDecimal(li.discountedUnitPriceSet.shopMoney.amount).multiply(
        BigDecimal.fromString(li.quantity.toFixed(0)),
      );

      const lineItemTax = remainingTax.multiply(lineItemPrice.divide(totalTaxable)).round(2, RoundingMode.FLOOR);

      totalTaxable = totalTaxable.subtract(lineItemPrice);
      remainingTax = remainingTax.subtract(lineItemTax);

      return lineItemTax.toMoney();
    })(),
    quantity: li.quantity,
    unitPrice: decimalToMoney(li.originalUnitPriceSet.shopMoney.amount),
    discountedUnitPrice: decimalToMoney(li.discountedUnitPriceSet.shopMoney.amount),
    order: {
      subtotal: subtotalPriceSet.shopMoney.amount,
      discount: appliedDiscount?.amountSet?.shopMoney?.amount ?? ZERO_MONEY,
      outstanding: totalPriceSet.shopMoney.amount,
      total: totalPriceSet.shopMoney.amount,
    },
    customAttributes: li.customAttributes,
  }));

  const lineItemIdByItemUuid = getLineItemIdsByUuids(calculatedLineItems, 'item');
  const lineItemIdByHourlyChargeUuid = getLineItemIdsByUuids(calculatedLineItems, 'hourly');
  const lineItemIdByFixedPriceChargeUuid = getLineItemIdsByUuids(calculatedLineItems, 'fixed');

  return calculateLineItems({
    lineItems: calculatedLineItems,
    items: items.map(item => ({
      uuid: item.uuid,
      quantity: item.quantity,
      shopifyOrderLineItemId: lineItemIdByItemUuid[item.uuid] ?? never('item is in calc'),
    })),
    fixedPriceLabourCharges: fixedPriceLabourCharges.map(charge => ({
      ...charge,
      shopifyOrderLineItemId: lineItemIdByFixedPriceChargeUuid[charge.uuid] ?? never('fixed charge is in calc'),
    })),
    hourlyCharges: hourlyLabourCharges.map(charge => ({
      ...charge,
      shopifyOrderLineItemId: lineItemIdByHourlyChargeUuid[charge.uuid] ?? never('hourly charge is in calc'),
    })),
    deposits: [],
  });
}

type LineItem = {
  id: ID;
  totalTax: string;
  unitPrice: string;
  discountedUnitPrice: string;
  quantity: number;
  order: {
    subtotal: string;
    discount: string;
    total: string;
    outstanding: string;
  };
};

/**
 * Central logic for calculating work order price information.
 * Expects to receive a list of all work order items/charges/deposits, as well as a list of line items to use for computation.
 * These line items can be from real orders, calculated draft orders, or from the database.
 */
function calculateLineItems({
  items,
  lineItems,
  hourlyCharges,
  fixedPriceLabourCharges,
  deposits,
}: {
  lineItems: LineItem[];
  items: Pick<IGetItemsResult, 'shopifyOrderLineItemId' | 'uuid' | 'quantity'>[];
  hourlyCharges: Pick<IGetHourlyLabourChargesResult, 'shopifyOrderLineItemId' | 'uuid' | 'hours' | 'rate'>[];
  fixedPriceLabourCharges: Pick<IGetFixedPriceLabourChargesResult, 'shopifyOrderLineItemId' | 'uuid' | 'amount'>[];
  deposits: Pick<IGetDepositsResult, 'shopifyOrderLineItemId' | 'uuid' | 'amount'>[];
}) {
  let subtotal = BigDecimal.ZERO;
  let tax = BigDecimal.ZERO;
  let total = BigDecimal.ZERO;
  let paid = BigDecimal.ZERO;
  let orderLevelDiscount = BigDecimal.ZERO;
  let lineItemLevelDiscount = BigDecimal.ZERO;

  const itemPrices: Record<string, Money> = {};
  const hourlyLabourChargePrices: Record<string, Money> = {};
  const fixedPriceLabourChargePrices: Record<string, Money> = {};
  const depositPrices: Record<string, Money> = {};

  for (const lineItem of lineItems) {
    assertMoney(lineItem.totalTax);
    assertMoney(lineItem.unitPrice);
    assertMoney(lineItem.discountedUnitPrice);

    const quantity = BigDecimal.fromString(lineItem.quantity.toFixed(0));
    const originalTotal = BigDecimal.fromMoney(lineItem.unitPrice).multiply(quantity);
    const discountedTotal = BigDecimal.fromMoney(lineItem.discountedUnitPrice).multiply(quantity);
    const discountedTaxedTotal = BigDecimal.fromMoney(lineItem.totalTax).add(discountedTotal);
    const lineItemDiscount = discountedTotal.subtract(originalTotal);

    lineItemLevelDiscount = lineItemLevelDiscount.add(lineItemDiscount);
    subtotal = subtotal.add(discountedTotal);
    tax = tax.add(BigDecimal.fromMoney(lineItem.totalTax));
    total = total.add(discountedTaxedTotal);

    // to compute how much of this line item has been paid, we simply take the % of the order paid, and multiply it by the % of the order's total that is this line item's price
    const { order } = lineItem;
    assertMoney(order.subtotal);
    assertMoney(order.discount);
    assertMoney(order.total);
    assertMoney(order.outstanding);

    const orderSubtotal = BigDecimal.fromMoney(order.subtotal);
    const orderDiscount = BigDecimal.fromMoney(order.discount);
    const orderOutstanding = BigDecimal.fromMoney(order.outstanding);
    const orderTotal = BigDecimal.fromMoney(order.total);

    // if the order has an order-level discount, we want to account for that here
    // order level discount applying to this line item = (line item $ / order subtotal) * order discount
    const orderDiscountFactor = (() => {
      // order-level discounts are applied on the subtotal (important for tax reasons)
      if (orderSubtotal.equals(BigDecimal.ZERO)) return BigDecimal.ZERO;
      return discountedTotal.divide(orderSubtotal.add(orderDiscount));
    })();
    orderLevelDiscount = orderLevelDiscount.add(orderDiscount.multiply(orderDiscountFactor));

    // line item paid = (line item $ / order total) * order % paid
    const orderPaid = orderTotal.subtract(orderOutstanding);
    const orderPaidFactor = (() => {
      if (orderTotal.equals(BigDecimal.ZERO)) return BigDecimal.ONE;
      return orderPaid.divide(orderTotal);
    })();
    const lineItemPaid = discountedTaxedTotal.multiply(orderPaidFactor);

    paid = paid.add(lineItemPaid);

    // next we break down the line item into its individual parts (items and charges)
    const lineItemItems = items.filter(hasPropertyValue('shopifyOrderLineItemId', lineItem.id));
    const lineItemHourlyCharges = hourlyCharges.filter(hasPropertyValue('shopifyOrderLineItemId', lineItem.id));
    const lineItemFixedCharges = fixedPriceLabourCharges.filter(
      hasPropertyValue('shopifyOrderLineItemId', lineItem.id),
    );
    const lineItemDeposits = deposits.filter(hasPropertyValue('shopifyOrderLineItemId', lineItem.id));

    if (lineItemDeposits.length > 1) {
      throw new Error('Only 1 deposit may be associated with a single line item');
    }

    if (lineItemDeposits.length === 1) {
      if ([lineItemItems, lineItemHourlyCharges, lineItemFixedCharges].some(l => l.length > 0)) {
        throw new Error('Deposits cannot be on the same line item as other items/charges');
      }

      const [lineItemDeposit = never('just checked xd')] = lineItemDeposits;

      assertMoney(lineItemDeposit.amount);

      depositPrices[lineItemDeposit.uuid] = lineItemPaid.toMoney();

      if (!discountedTotal.equals(BigDecimal.fromString(lineItemDeposit.amount))) {
        sentryErr('Deposit DB amount does not match the line item amount - hmm', {
          discountedTotal: discountedTotal.toMoney(),
          lineItemDepositAmount: lineItemDeposit.amount,
        });
      }

      continue;
    }

    // if the line item is discounted, we uniformly distribute this discount over all its items/charges
    const discountFactor = (() => {
      if (originalTotal.equals(BigDecimal.ZERO)) return BigDecimal.ONE;
      return discountedTotal.divide(originalTotal);
    })();

    // to determine the item price, we subtract the price of all absorbed charges and distribute the rest over the remaining item quantity
    let itemPrice = discountedTotal;

    for (const [charges, chargePrice] of [
      [lineItemHourlyCharges, hourlyLabourChargePrices],
      [lineItemFixedCharges, fixedPriceLabourChargePrices],
    ] as const) {
      for (const charge of charges) {
        const originalChargeTotal = BigDecimal.fromMoney(getChargeUnitPrice(charge));
        const discountedChargeTotal = originalChargeTotal.multiply(discountFactor).round(2, RoundingMode.CEILING);

        chargePrice[charge.uuid] = discountedChargeTotal.toMoney();

        itemPrice = itemPrice.subtract(discountedChargeTotal);
      }

      itemPrice = itemPrice.round(2, RoundingMode.CEILING);
      itemPrice = BigDecimal.max(BigDecimal.ZERO, itemPrice);
    }

    // we will now distribute the remaining item price over all line item items
    const lineItemQuantity = sum(lineItemItems.map(li => li.quantity));

    for (const [i, lineItemItem] of lineItemItems.entries()) {
      let divideQuantity = lineItemQuantity - i; // we divide the remaining item price by the remaining qty. this ensures we round the last item to the remaining balance, leaving no trailing cents

      if (divideQuantity <= 0) {
        // if this is a service, the quantity of each line item item will be zero, so handle that by distributing uniformly
        divideQuantity = lineItemItems.length - i;
      }

      const lineItemItemPrice = itemPrice.divide(BigDecimal.fromString(divideQuantity.toFixed(0)));
      itemPrices[lineItemItem.uuid] = lineItemItemPrice.toMoney();
      itemPrice = itemPrice.subtract(lineItemItemPrice);
    }
  }

  total = total.subtract(orderLevelDiscount);
  const outstanding = total.subtract(paid);

  return {
    orderDiscount: orderLevelDiscount.toMoney(),
    lineItemDiscount: lineItemLevelDiscount.toMoney(),
    subtotal: subtotal.toMoney(),
    tax: tax.toMoney(),
    total: total.toMoney(),
    paid: paid.toMoney(),
    outstanding: outstanding.toMoney(),
    itemPrices,
    hourlyLabourChargePrices,
    fixedPriceLabourChargePrices,
    depositPrices,
  };
}

function isLineItemId(id: string | null): id is ID {
  return id !== null && parseGid(id).objectName === 'LineItem';
}
