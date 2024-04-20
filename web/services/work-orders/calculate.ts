import { Session } from '@shopify/shopify-api';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import {
  getWorkOrderLineItems,
  getCustomAttributeArrayFromObject,
  getChargeUnitPrice,
  getItemUuidCustomAttributeKey,
  getAbsorbedUuidsFromCustomAttributes,
  getChargeUuidCustomAttributeKey,
  getWorkOrderAppliedDiscount,
} from '@work-orders/work-order-shopify-order';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { getShopSettings } from '../settings.js';
import { db } from '../db/db.js';
import { indexBy, sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertMoney, BigDecimal, Money, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { decimalToMoney } from '../../util/decimal.js';
import { evaluate } from '../../util/evaluate.js';
import { getWorkOrderDepositedAmount, getWorkOrderDepositedReconciledAmount } from './get.js';

type CalculateWorkOrderResult = {
  outstanding: Money;
  paid: Money;
  /**
   * The total discount, including draft orders.
   */
  discount: Money;
  /**
   * The discount that has been applied so far.
   */
  appliedDiscount: Money;
  subtotal: Money;
  total: Money;
  tax: Money;
  itemPrices: Record<string, Money>;
  hourlyLabourChargePrices: Record<string, Money>;
  fixedPriceLabourChargePrices: Record<string, Money>;
  depositPrices: Record<string, Money>;
};

type CalculateDraftOrderResult = Omit<
  CalculateWorkOrderResult,
  'appliedDiscount' | 'paid' | 'outstanding' | 'depositPrices'
>;

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
  const existingOrderCalculation = await calculateDatabaseOrders(session, calculateWorkOrder);

  const draftItems = calculateWorkOrder.items.filter(item => !(item.uuid in existingOrderCalculation.itemPrices));
  const draftCharges = calculateWorkOrder.charges.filter(charge => {
    if (charge.type === 'hourly-labour') {
      return !(charge.uuid in existingOrderCalculation.hourlyLabourChargePrices);
    }

    if (charge.type === 'fixed-price-labour') {
      return !(charge.uuid in existingOrderCalculation.fixedPriceLabourChargePrices);
    }

    return charge satisfies never;
  });

  const newOrderCalculation = await calculateDraftOrder(session, {
    name: calculateWorkOrder.name,
    items: draftItems,
    charges: draftCharges,
    discount: calculateWorkOrder.discount,
  });

  return {
    subtotal: BigDecimal.fromMoney(existingOrderCalculation.subtotal)
      .add(BigDecimal.fromMoney(newOrderCalculation.subtotal))
      .toMoney(),
    tax: BigDecimal.fromMoney(existingOrderCalculation.tax)
      .add(BigDecimal.fromMoney(newOrderCalculation.tax))
      .toMoney(),
    appliedDiscount: existingOrderCalculation.appliedDiscount,
    discount: BigDecimal.fromMoney(existingOrderCalculation.discount)
      .add(BigDecimal.fromMoney(newOrderCalculation.discount))
      .toMoney(),
    paid: BigDecimal.fromMoney(existingOrderCalculation.paid).toMoney(),
    outstanding: BigDecimal.fromMoney(existingOrderCalculation.outstanding)
      .add(BigDecimal.fromMoney(newOrderCalculation.total))
      .toMoney(),
    total: BigDecimal.fromMoney(existingOrderCalculation.total)
      .add(BigDecimal.fromMoney(newOrderCalculation.total))
      .toMoney(),
    fixedPriceLabourChargePrices: {
      ...existingOrderCalculation.fixedPriceLabourChargePrices,
      ...newOrderCalculation.fixedPriceLabourChargePrices,
    },
    hourlyLabourChargePrices: {
      ...existingOrderCalculation.hourlyLabourChargePrices,
      ...newOrderCalculation.hourlyLabourChargePrices,
    },
    itemPrices: {
      ...existingOrderCalculation.itemPrices,
      ...newOrderCalculation.itemPrices,
    },
    depositPrices: existingOrderCalculation.depositPrices,
  };
}

async function calculateDraftOrder(
  session: Session,
  { name, items, charges, discount }: Pick<CalculateWorkOrder, 'name' | 'items' | 'charges' | 'discount'>,
): Promise<CalculateDraftOrderResult> {
  if (items.length === 0 && charges.length === 0) {
    return {
      total: BigDecimal.ZERO.toMoney(),
      tax: BigDecimal.ZERO.toMoney(),
      subtotal: BigDecimal.ZERO.toMoney(),
      discount: BigDecimal.ZERO.toMoney(),
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
    : { depositedAmount: BigDecimal.ZERO.toMoney(), depositedReconciledAmount: BigDecimal.ZERO.toMoney() };

  const appliedDiscount = getWorkOrderAppliedDiscount(discount, deposit);

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
        appliedDiscount,
      },
    })
    .then(r => r.draftOrderCalculate);

  if (!result) {
    sentryErr('Draft order calculation failed - no result', { result });
    throw new HttpError('Calculation failed', 500);
  }

  if (result.userErrors.length) {
    sentryErr('Draft order calculation failed - user errors', { userErrors: result.userErrors });
    throw new HttpError('Calculation failed', 500);
  }

  if (!result.calculatedDraftOrder) {
    sentryErr('Draft order calculation failed - no body', { result });
    throw new HttpError('Calculation failed', 500);
  }

  const {
    totalPrice: total,
    totalTax: tax,
    subtotalPrice: subtotal,
    lineItems: calculatedLineItems,
    totalDiscountsSet,
  } = result.calculatedDraftOrder;

  const itemPrices: Record<string, Money> = {};
  const hourlyLabourChargePrices: Record<string, Money> = {};
  const fixedPriceLabourChargePrices: Record<string, Money> = {};

  for (const item of items) {
    const lineItems = calculatedLineItems.filter(lineItem =>
      lineItem.customAttributes.some(ca => ca.key === getItemUuidCustomAttributeKey(item)),
    );

    if (lineItems.length > 1) {
      throw new Error('An item should have just one line item');
    }

    const [lineItem = never()] = lineItems;

    const originalTotal = BigDecimal.fromDecimal(lineItem.originalTotal.amount);
    const discountedTotal = BigDecimal.fromDecimal(lineItem.discountedTotal.amount);

    // we distribute the order-level discount over all line items. this is needed because lineItem.discountedTotal only takes line-item-level discounts into account
    const discountFactor = evaluate(() => {
      if (originalTotal.equals(BigDecimal.ZERO)) return BigDecimal.ONE;
      return discountedTotal.divide(originalTotal);
    });

    let itemPrice = BigDecimal.fromDecimal(lineItem.discountedTotal.amount);

    // we get the item price by removing all absorbed charges and taking whatever remains

    const absorbedUuids = getAbsorbedUuidsFromCustomAttributes(lineItem.customAttributes);

    for (const { absorbedUuid } of absorbedUuids) {
      let charge;
      if (absorbedUuid.type === 'hourly') {
        charge = hourlyLabourCharges.find(hasPropertyValue('uuid', absorbedUuid.uuid)) ?? never();
      } else if (absorbedUuid.type === 'fixed') {
        charge = fixedPriceLabourCharges.find(hasPropertyValue('uuid', absorbedUuid.uuid)) ?? never();
      } else if (absorbedUuid.type === 'item') {
        // this should be impossible. we cannot calculate this
        throw new Error('Unexpected absorbed item');
      } else {
        throw new Error('Unexpected absorbed charge type');
      }

      let chargePrice = getChargeUnitPrice(charge);

      // spread the discount evenly across all absorbed charges and attribute any remainder to the item (since we don't know the item price here)
      chargePrice = BigDecimal.fromMoney(chargePrice).multiply(discountFactor).toMoney(); // since this is an absorbed charge we do not round

      ({ hourly: hourlyLabourChargePrices, fixed: fixedPriceLabourChargePrices })[absorbedUuid.type][charge.uuid] =
        chargePrice;

      itemPrice = itemPrice.subtract(BigDecimal.fromMoney(chargePrice));
    }

    itemPrice = itemPrice.round(2, RoundingMode.CEILING);

    itemPrice = BigDecimal.max(BigDecimal.ZERO, itemPrice);

    itemPrices[item.uuid] = itemPrice.toMoney();
  }

  // now we only need to process non-absorbed charges
  for (const [chargePrices, charges] of [
    [hourlyLabourChargePrices, hourlyLabourCharges],
    [fixedPriceLabourChargePrices, fixedPriceLabourCharges],
  ] as const) {
    for (const charge of charges) {
      if (charge.uuid in chargePrices) {
        // the charge was absorbed
        continue;
      }

      const lineItems = calculatedLineItems.filter(lineItem =>
        lineItem.customAttributes.some(
          ca =>
            ca.key ===
            getChargeUuidCustomAttributeKey({
              uuid: charge.uuid,
              type: ({ 'hourly-labour': 'hourly', 'fixed-price-labour': 'fixed' } as const)[charge.type],
            }),
        ),
      );

      if (lineItems.length > 1) {
        throw new Error('A charge should have just one line item');
      }

      const [lineItem = never()] = lineItems;

      chargePrices[charge.uuid] = decimalToMoney(lineItem.discountedTotal.amount);
    }
  }

  return {
    total,
    tax,
    subtotal,
    discount: decimalToMoney(totalDiscountsSet.shopMoney.amount),
    itemPrices,
    hourlyLabourChargePrices,
    fixedPriceLabourChargePrices,
  };
}

/**
 * Same as calculateDraftOrder, but uses all order line items associated with the work order.
 * Does NOT use draft orders.
 */
async function calculateDatabaseOrders(
  session: Session,
  calculateWorkOrder: CalculateWorkOrder,
): Promise<CalculateWorkOrderResult> {
  const { shop } = session;
  const { name } = calculateWorkOrder;

  if (!name) {
    return {
      total: BigDecimal.ZERO.toMoney(),
      tax: BigDecimal.ZERO.toMoney(),
      subtotal: BigDecimal.ZERO.toMoney(),
      paid: BigDecimal.ZERO.toMoney(),
      outstanding: BigDecimal.ZERO.toMoney(),
      discount: BigDecimal.ZERO.toMoney(),
      appliedDiscount: BigDecimal.ZERO.toMoney(),
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

  let total = BigDecimal.ZERO;
  let tax = BigDecimal.ZERO;
  let subtotal = BigDecimal.ZERO;
  let paid = BigDecimal.ZERO;
  let discount = BigDecimal.ZERO;

  // these are discounted total, excluding taxes, shipping, etc.

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

    discount = discount.add(discountedTotal.subtract(originalTotal));
    subtotal = subtotal.add(discountedTotal);
    tax = tax.add(BigDecimal.fromMoney(lineItem.totalTax));
    total = total.add(discountedTaxedTotal);

    // to compute how much of this line item has been paid, we simply take the % of the order paid, and multiply it by the % of the order's total that is this line item's price
    const order = orderById[lineItem.orderId] ?? never('fk');
    assertMoney(order.total);
    assertMoney(order.outstanding);

    const orderOutstanding = BigDecimal.fromMoney(order.outstanding);
    const orderTotal = BigDecimal.fromMoney(order.total);

    const orderPaid = orderTotal.subtract(orderOutstanding);
    const lineItemPaid = evaluate(() => {
      if (orderTotal.equals(BigDecimal.ZERO)) return BigDecimal.ZERO;
      return orderPaid.divide(orderTotal).multiply(discountedTaxedTotal);
    });

    paid = paid.add(lineItemPaid);

    // next we break down the line item into its individual parts (items and charges)
    const lineItemItems = databaseItems.filter(hasPropertyValue('shopifyOrderLineItemId', lineItem.lineItemId));
    const lineItemHourlyCharges = databaseHourlyCharges.filter(
      hasPropertyValue('shopifyOrderLineItemId', lineItem.lineItemId),
    );
    const lineItemFixedCharges = databaseFixedCharges.filter(
      hasPropertyValue('shopifyOrderLineItemId', lineItem.lineItemId),
    );
    const lineItemDeposits = databaseDeposits.filter(hasPropertyValue('shopifyOrderLineItemId', lineItem.lineItemId));

    if (lineItemDeposits.length > 1) {
      throw new Error('Only 1 deposit may be associated with a single line item');
    }

    if (lineItemDeposits.length === 1) {
      if ([lineItemItems, lineItemHourlyCharges, lineItemFixedCharges].some(l => l.length > 0)) {
        throw new Error('Deposits cannot be on the same line item as other items/charges');
      }

      const [lineItemDeposit = never()] = lineItemDeposits;

      assertMoney(lineItemDeposit.amount);

      depositPrices[lineItemDeposit.uuid] = lineItemDeposit.amount;

      continue;
    }

    const discountFactor = evaluate(() => {
      if (originalTotal.equals(BigDecimal.ZERO)) return BigDecimal.ONE;
      return discountedTotal.divide(originalTotal);
    });

    // to determine the item price, we subtract the price of all absorbed charges and distribute the rest over the remaining quantity
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
        divideQuantity = 1;
      }

      const lineItemItemPrice = itemPrice.divide(BigDecimal.fromString(divideQuantity.toFixed(0)));
      itemPrices[lineItemItem.uuid] = lineItemItemPrice.toMoney();
      itemPrice = itemPrice.subtract(lineItemItemPrice);
    }
  }

  const outstanding = total.subtract(paid);

  // no need to round here as the db entries are already rounded

  return {
    subtotal: subtotal.toMoney(),
    total: total.toMoney(),
    tax: tax.toMoney(),
    paid: paid.toMoney(),
    outstanding: outstanding.toMoney(),
    discount: discount.toMoney(),
    appliedDiscount: discount.toMoney(),
    itemPrices,
    hourlyLabourChargePrices,
    fixedPriceLabourChargePrices,
    depositPrices,
  };
}

function isLineItemId(id: string | null): id is ID {
  return id !== null && parseGid(id).objectName === 'LineItem';
}
