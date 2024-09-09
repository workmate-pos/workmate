import { Session } from '@shopify/shopify-api';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { fetchAllPages, gql } from '../gql/gql.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getChargeUnitPrice, getUuidsFromCustomAttributes } from '@work-orders/work-order-shopify-order';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { db } from '../db/db.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { assertGid, createGid, ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
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
import { getMissingNonPaidWorkOrderProduct, validateCalculateWorkOrder } from './validate.js';
import { randomBytes } from 'node:crypto';
import { Int, type String } from '../gql/queries/generated/schema.js';
import { getDraftOrderInputForWorkOrder } from './draft-order.js';
import { getWorkOrder, getWorkOrderCharges, getWorkOrderItems } from './queries.js';
import { UUID } from '../../util/types.js';

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
  itemLineItemIds: Record<string, ID>;
  chargePrices: Record<string, Money>;
  chargeLineItemIds: Record<string, ID>;
  missingProductVariantIds: ID[];
  warnings: string[];
  lineItems: {
    id: ID;
    name: string;
    sku: string | null;
    unitPrice: Money;
    quantity: Int;
    taxable: boolean;
    image: {
      url: string;
    } | null;
    variant: gql.calculate.ProductVariantFragment.Result | null;
    order: {
      name: string;
      fullyPaid: boolean;
    } | null;
    customAttributes: { key: String; value: String | null }[];
  }[];
};

type CalculateWorkOrderItem = Omit<CalculateWorkOrder['items'][number], 'customFields'>;

type CalculateWorkOrderCharge = CalculateWorkOrder['charges'][number];

/**
 * Calculates the price of a work order on a per-item/charge + overall basis.
 *
 * Uses existing orders when present, but uses the `draftOrderCalculate` mutation otherwise.
 * Also includes product/line item information to support deleted products.
 * Tries to not throw, but to instead send an error/warning along with a semi-correct result (e.g. in case there are missing products/deleted orders).
 */
export async function calculateWorkOrder(
  session: Session,
  calculateWorkOrder: CalculateWorkOrder,
  options: { includeExistingOrders: boolean },
): Promise<CalculateWorkOrderResult> {
  await validateCalculateWorkOrder(session, calculateWorkOrder, true);

  const { name } = calculateWorkOrder;

  let tax = ZERO_MONEY;
  let total = ZERO_MONEY;
  let subtotal = ZERO_MONEY;
  let outstanding = ZERO_MONEY;
  let appliedOrderDiscount = ZERO_MONEY;
  let totalOrderDiscount = ZERO_MONEY;
  let appliedLineItemDiscount = ZERO_MONEY;
  let totalLineItemDiscount = ZERO_MONEY;

  const lineItems: CalculateWorkOrderResult['lineItems'] = [];

  const itemPrices: Record<string, Money> = {};
  const chargePrices: Record<string, Money> = {};

  const itemLineItemIds: Record<string, ID> = {};
  const chargeLineItemIds: Record<string, ID> = {};

  const missingProductVariantIds = await getMissingNonPaidWorkOrderProduct(session, calculateWorkOrder);
  const warnings: string[] = [];

  // All orders involved in the WO, including all their line items. These will be processed to compute everything.
  const orders: (OrderWithAllLineItems | CalculatedDraftOrderWithFakeIds)[] = [];

  const items: CalculateWorkOrderItem[] = [];
  const charges: CalculateWorkOrderCharge[] = [];

  if (name && options.includeExistingOrders) {
    const existingInfo = await getExistingOrderInfo(session, name);

    orders.push(...existingInfo.orders);

    items.push(...existingInfo.items);
    charges.push(...existingInfo.charges);

    Object.assign(itemLineItemIds, existingInfo.itemLineItemIds);
    Object.assign(chargeLineItemIds, existingInfo.chargeLineItemIds);

    warnings.push(...existingInfo.warnings);
  }

  // do draftOrderCalculate stuff on items/charges that aren't in an order yet

  const newItems = calculateWorkOrder.items.filter(item => {
    if (items.some(hasPropertyValue('uuid', item.uuid))) {
      return false;
    }

    if (item.type === 'product') {
      return !missingProductVariantIds.includes(item.productVariantId);
    }

    return true;
  });

  const newCharges = calculateWorkOrder.charges.filter(charge => !charges.some(hasPropertyValue('uuid', charge.uuid)));

  const calculation = await getCalculatedDraftOrderInfo(session, {
    ...calculateWorkOrder,
    items: newItems,
    charges: newCharges,
  });

  if (calculation.calculatedDraftOrder) {
    orders.push(calculation.calculatedDraftOrder);

    items.push(...newItems);
    charges.push(...newCharges);

    Object.assign(itemLineItemIds, calculation.itemLineItemIds);
    Object.assign(chargeLineItemIds, calculation.chargeLineItemIds);
  }

  // process orders and line items to get work order totals and item/charge prices
  for (const order of orders) {
    const orderPriceInfo = getOrderPriceInformation(order);

    tax = addMoney(tax, orderPriceInfo.tax);
    total = addMoney(total, orderPriceInfo.total);
    subtotal = addMoney(subtotal, orderPriceInfo.subtotal);
    outstanding = addMoney(outstanding, orderPriceInfo.outstanding);
    appliedOrderDiscount = addMoney(appliedOrderDiscount, orderPriceInfo.appliedOrderDiscount);
    totalOrderDiscount = addMoney(totalOrderDiscount, orderPriceInfo.totalOrderDiscount);

    for (const lineItem of order.lineItems) {
      lineItems.push({
        id: lineItem.id,
        name: lineItem.name,
        sku: lineItem.sku,
        image: lineItem.image,
        variant: lineItem.variant,
        order:
          order.__typename === 'Order'
            ? {
                name: order.name,
                fullyPaid: order.fullyPaid,
              }
            : null,
        unitPrice: decimalToMoney(lineItem.discountedUnitPriceSet.shopMoney.amount),
        quantity: lineItem.quantity,
        taxable: lineItem.taxable,
        customAttributes: lineItem.customAttributes,
      });

      const lineItemPriceInfo = getLineItemPriceInformation(
        lineItem,
        items,
        charges,
        itemLineItemIds,
        chargeLineItemIds,
      );

      totalLineItemDiscount = addMoney(totalLineItemDiscount, lineItemPriceInfo.lineItemDiscount);

      if (order.__typename === 'Order') {
        appliedLineItemDiscount = addMoney(appliedLineItemDiscount, lineItemPriceInfo.lineItemDiscount);
      }

      mergeIntoMoneyDictionary(itemPrices, lineItemPriceInfo.itemPrices);
      mergeIntoMoneyDictionary(chargePrices, lineItemPriceInfo.chargePrices);

      warnings.push(...lineItemPriceInfo.warnings);
    }
  }

  const knownLineItemIds = new Set(orders.flatMap(order => order.lineItems.map(lineItem => lineItem.id)));
  const missingLineItemIds = [...Object.values(itemLineItemIds), ...Object.values(chargeLineItemIds)].filter(
    lineItemId => !knownLineItemIds.has(lineItemId),
  );

  if (missingLineItemIds.length > 0) {
    warnings.push(`${missingLineItemIds.length} line items were not found - excluding them.`);
  }

  return {
    tax,
    total,
    subtotal,
    outstanding,

    orderDiscount: { total: totalOrderDiscount, applied: appliedOrderDiscount },
    lineItemDiscount: { total: totalLineItemDiscount, applied: appliedLineItemDiscount },

    lineItems,

    itemPrices,
    chargePrices,

    itemLineItemIds,
    chargeLineItemIds,

    missingProductVariantIds,
    warnings,
  };
}

async function getExistingOrderInfo(session: Session, name: string) {
  const graphql = new Graphql(session);

  const itemLineItemIds: Record<string, ID> = {};
  const chargeLineItemIds: Record<string, ID> = {};

  const warnings: string[] = [];

  const workOrder = await getWorkOrder({ shop: session.shop, name });

  if (!workOrder) {
    throw new HttpError('Work order not found', 404);
  }

  const { id: workOrderId } = workOrder;

  const [databaseItems, databaseCharges] = await Promise.all([
    getWorkOrderItems(workOrderId),
    getWorkOrderCharges(workOrderId),
  ]);

  const lineItemIds = new Set<ID>();

  const items = databaseItems
    .filter(item => isLineItemId(item.shopifyOrderLineItemId))
    .map(({ data, uuid, shopifyOrderLineItemId }) => ({
      ...data,
      uuid,
      shopifyOrderLineItemId,
    }));

  const charges = databaseCharges
    .filter(charge => isLineItemId(charge.shopifyOrderLineItemId))
    .map(({ data, uuid, shopifyOrderLineItemId, workOrderItemUuid }) => ({
      ...data,
      uuid,
      shopifyOrderLineItemId,
      workOrderItemUuid: workOrderItemUuid as UUID | null,
    }));

  for (const item of items) {
    if (!isLineItemId(item.shopifyOrderLineItemId)) never();
    lineItemIds.add(item.shopifyOrderLineItemId);
    itemLineItemIds[item.uuid] = item.shopifyOrderLineItemId;
  }

  for (const charge of charges) {
    if (!isLineItemId(charge.shopifyOrderLineItemId)) never();
    lineItemIds.add(charge.shopifyOrderLineItemId);
    chargeLineItemIds[charge.uuid] = charge.shopifyOrderLineItemId;
  }

  const lineItems = lineItemIds.size ? await db.shopifyOrder.getLineItemsByIds({ lineItemIds: [...lineItemIds] }) : [];

  const orderIds = unique(
    lineItems.map(lineItem => {
      assertGid(lineItem.orderId);
      return lineItem.orderId;
    }),
  );

  // We assume that every order only contains items added to the work order
  // TODO: Automatically add these items to the work order in case this happens
  const orders = await getOrdersWithAllLineItems(graphql, orderIds);

  if (orders.length < orderIds.length) {
    warnings.push(`${orderIds.length - orders.length} orders were not found - excluding them from price calculations.`);
  }

  return {
    orders,
    warnings,
    items,
    charges,
    itemLineItemIds,
    chargeLineItemIds,
  };
}

type CalculatedDraftOrderWithFakeIds = NonNullable<
  Awaited<ReturnType<typeof getCalculatedDraftOrderInfo>>['calculatedDraftOrder']
>;

/**
 * Uses the `draftOrderCalculate` mutation and creates dictionaries mapping items/charges to line items.
 */
async function getCalculatedDraftOrderInfo(session: Session, calculateWorkOrder: CalculateWorkOrder) {
  const draftOrderInput = await getDraftOrderInputForWorkOrder(session, {
    items: calculateWorkOrder.items,
    charges: calculateWorkOrder.charges,
    discount: calculateWorkOrder.discount,
    note: null,
    workOrderName: calculateWorkOrder.name,
    customFields: null,
    customerId: calculateWorkOrder.customerId,
    paymentTerms: null,
    companyContactId: calculateWorkOrder.companyContactId,
    companyLocationId: calculateWorkOrder.companyLocationId,
    companyId: calculateWorkOrder.companyId,
  });

  const itemLineItemIds: Record<string, ID> = {};
  const chargeLineItemIds: Record<string, ID> = {};

  if (!draftOrderInput.lineItems?.length) {
    return {
      calculatedDraftOrder: null,
      itemLineItemIds,
      chargeLineItemIds,
    };
  }

  const graphql = new Graphql(session);

  console.log(draftOrderInput.paymentTerms);
  const result = await gql.calculate.draftOrderCalculate.run(graphql, { input: draftOrderInput });
  if (!result.draftOrderCalculate?.calculatedDraftOrder) {
    throw new HttpError('Calculation failed', 400);
  }

  const calculatedDraftOrder = {
    ...result.draftOrderCalculate.calculatedDraftOrder,
    lineItems: result.draftOrderCalculate.calculatedDraftOrder.lineItems.map(lineItem => {
      // `draftOrderCalculate` does not give line items ids, but we need those to map between items/charges and line items.
      // so just create a random one
      const id = createGid('CalculatedDraftLineItem', randomBytes(8).join(''));

      for (const uuid of getUuidsFromCustomAttributes(lineItem.customAttributes)) {
        if (uuid.type === 'item') {
          itemLineItemIds[uuid.uuid] = id;
        } else if (uuid.type === 'charge') {
          chargeLineItemIds[uuid.uuid] = id;
        } else {
          return uuid.type satisfies never;
        }
      }

      return { ...lineItem, id };
    }),
  };

  return {
    calculatedDraftOrder,
    itemLineItemIds,
    chargeLineItemIds,
  };
}

function getOrderPriceInformation(order: OrderWithAllLineItems | CalculatedDraftOrderWithFakeIds) {
  const tax = decimalToMoney(order.currentTotalTaxSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal());
  const total = decimalToMoney(order.currentTotalPriceSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal());
  const subtotal = decimalToMoney(order.currentSubtotalPriceSet?.shopMoney?.amount ?? BigDecimal.ZERO.toDecimal());
  const outstanding = decimalToMoney(
    order.__typename === 'Order'
      ? order.totalOutstandingSet.shopMoney.amount
      : order.currentTotalPriceSet.shopMoney.amount,
  );
  const orderDiscount = decimalToMoney(
    order.__typename === 'Order'
      ? order.currentTotalDiscountsSet.shopMoney.amount
      : (order.appliedDiscount?.amountSet.shopMoney.amount ?? BigDecimal.ZERO.toDecimal()),
  );

  return {
    tax,
    total,
    subtotal,
    outstanding,
    totalOrderDiscount: orderDiscount,
    appliedOrderDiscount: order.__typename === 'Order' ? orderDiscount : ZERO_MONEY,
  };
}

function getLineItemPriceInformation(
  lineItem: (OrderWithAllLineItems | CalculatedDraftOrderWithFakeIds)['lineItems'][number],
  items: CalculateWorkOrderItem[],
  charges: CalculateWorkOrderCharge[],
  itemLineItemIds: Record<string, ID>,
  chargeLineItemIds: Record<string, ID>,
) {
  const itemPrices: Record<string, Money> = {};
  const chargePrices: Record<string, Money> = {};

  const warnings: string[] = [];

  const discountedTotal = decimalToMoney(lineItem.discountedTotalSet.shopMoney.amount);
  const originalTotal = decimalToMoney(lineItem.originalTotalSet.shopMoney.amount);

  const lineItemDiscount = subtractMoney(originalTotal, discountedTotal);

  // next, we determine the price of every thing contained in this line item (items, charges, etc)

  const lineItemItems = items.filter(item => itemLineItemIds[item.uuid] === lineItem.id);
  const lineItemCharges = charges.filter(charge => chargeLineItemIds[charge.uuid] === lineItem.id);

  // if the line item is discounted, we apply the same discount % on every contained item/charge
  const discountFactor = (() => {
    if (compareMoney(decimalToMoney(lineItem.discountedTotalSet.shopMoney.amount), ZERO_MONEY) === 0)
      return BigDecimal.ONE;
    return BigDecimal.fromMoney(divideMoney(discountedTotal, originalTotal));
  })();

  // 1) determine the price of charges
  let remainingLineItemPrice = discountedTotal;

  for (const charge of lineItemCharges) {
    const originalChargeTotal = BigDecimal.fromMoney(getChargeUnitPrice(charge));
    const discountedChargeTotal = originalChargeTotal.multiply(discountFactor).round(2, RoundingMode.CEILING);

    chargePrices[charge.uuid] = discountedChargeTotal.toMoney();
    remainingLineItemPrice = subtractMoney(remainingLineItemPrice, discountedChargeTotal.toMoney());
  }

  remainingLineItemPrice = roundMoney(remainingLineItemPrice, 2, RoundingMode.CEILING);
  remainingLineItemPrice = maxMoney(remainingLineItemPrice, ZERO_MONEY);

  // 2) the remainder goes to the items (distributed by quantity)
  let remainingItemQuantity = sum(lineItemItems.map(item => Math.max(1, item.quantity)));

  for (const item of lineItemItems) {
    const itemPrice = BigDecimal.fromMoney(remainingLineItemPrice)
      .divide(BigDecimal.fromString(remainingItemQuantity.toFixed(0)))
      .multiply(BigDecimal.fromString(Math.max(1, item.quantity).toFixed(0)))
      .round(2, RoundingMode.FLOOR)
      .toMoney();

    itemPrices[item.uuid] = itemPrice;

    remainingItemQuantity -= item.quantity;
    remainingLineItemPrice = subtractMoney(remainingLineItemPrice, itemPrice);
  }

  return {
    lineItemDiscount,
    itemPrices,
    chargePrices,
    warnings,
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

function mergeIntoMoneyDictionary(a: Record<string, Money>, b: Record<string, Money>) {
  for (const [key, value] of Object.entries(b)) {
    a[key] = addMoney(a[key] ?? ZERO_MONEY, value);
  }
}

function isLineItemId(id: string | null): id is ID {
  return id !== null && parseGid(id).objectName === 'LineItem';
}
