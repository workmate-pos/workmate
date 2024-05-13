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
import { IGetItemsResult } from '../db/queries/generated/work-order.sql.js';
import {
  IGetFixedPriceLabourChargesResult,
  IGetHourlyLabourChargesResult,
} from '../db/queries/generated/work-order-charges.sql.js';
import { getMissingNonPaidWorkOrderProduct, validateCalculateWorkOrder } from './validate.js';
import { v4 as uuid } from 'uuid';

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
  hourlyLabourChargePrices: Record<string, Money>;
  hourlyLabourChargeLineItemIds: Record<string, ID>;
  fixedPriceLabourChargePrices: Record<string, Money>;
  fixedPriceLabourChargeLineItemIds: Record<string, ID>;
  missingProductVariantIds: ID[];
  warnings: string[];
  lineItems: {
    id: ID;
    name: string;
    sku: string | null;
    unitPrice: Money;
    image: {
      url: string;
    } | null;
    variant: gql.calculate.ProductVariantFragment.Result | null;
    order: {
      name: string;
    } | null;
  }[];
};

type WorkOrderItem = {
  shopifyOrderLineItemId: string | null;
  uuid: string;
  quantity: number;
  absorbCharges: boolean;
};

type WorkOrderHourlyLabourCharge = {
  shopifyOrderLineItemId: string | null;
  uuid: string;
  hours: string;
  rate: string;
};

type WorkOrderFixedPriceLabourCharge = {
  shopifyOrderLineItemId: string | null;
  uuid: string;
  amount: string;
};

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
  const hourlyLabourChargePrices: Record<string, Money> = {};
  const fixedPriceLabourChargePrices: Record<string, Money> = {};

  const itemLineItemIds: Record<string, ID> = {};
  const hourlyLabourChargeLineItemIds: Record<string, ID> = {};
  const fixedPriceLabourChargeLineItemIds: Record<string, ID> = {};

  const missingProductVariantIds = await getMissingNonPaidWorkOrderProduct(session, calculateWorkOrder);
  const warnings: string[] = [];

  // All orders involved in the WO, including all their line items. These will be processed to compute everything.
  const orders: (OrderWithAllLineItems | CalculatedDraftOrderWithFakeIds)[] = [];

  const items: WorkOrderItem[] = [];
  const hourlyLabourCharges: WorkOrderHourlyLabourCharge[] = [];
  const fixedPriceLabourCharges: WorkOrderFixedPriceLabourCharge[] = [];

  if (name) {
    const existingInfo = await getExistingOrderInfo(session, name);

    orders.push(...existingInfo.orders);

    items.push(...existingInfo.items);
    hourlyLabourCharges.push(...existingInfo.hourlyLabourCharges);
    fixedPriceLabourCharges.push(...existingInfo.fixedPriceLabourCharges);

    Object.assign(itemLineItemIds, existingInfo.itemLineItemIds);
    Object.assign(hourlyLabourChargeLineItemIds, existingInfo.hourlyLabourChargeLineItemIds);
    Object.assign(fixedPriceLabourChargeLineItemIds, existingInfo.fixedPriceLabourChargeLineItemIds);

    warnings.push(...existingInfo.warnings);
  }

  // do draftOrderCalculate stuff on items/charges that aren't in an order yet

  const newItems = calculateWorkOrder.items
    .filter(item => !items.some(hasPropertyValue('uuid', item.uuid)))
    .filter(item => !missingProductVariantIds.includes(item.productVariantId));

  const newCharges = calculateWorkOrder.charges.filter(charge => {
    if (charge.type === 'hourly-labour') {
      return !hourlyLabourCharges.some(hasPropertyValue('uuid', charge.uuid));
    }

    if (charge.type === 'fixed-price-labour') {
      return !fixedPriceLabourCharges.some(hasPropertyValue('uuid', charge.uuid));
    }

    return charge satisfies never;
  });

  const calculation = await getCalculatedDraftOrderInfo(session, {
    ...calculateWorkOrder,
    items: newItems,
    charges: newCharges,
  });

  if (calculation.calculatedDraftOrder) {
    orders.push(calculation.calculatedDraftOrder);

    items.push(...calculation.items);
    hourlyLabourCharges.push(...calculation.hourlyLabourCharges);
    fixedPriceLabourCharges.push(...calculation.fixedPriceLabourCharges);

    Object.assign(itemLineItemIds, calculation.itemLineItemIds);
    Object.assign(hourlyLabourChargeLineItemIds, calculation.hourlyLabourChargeLineItemIds);
    Object.assign(fixedPriceLabourChargeLineItemIds, calculation.fixedPriceLabourChargeLineItemIds);
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
        order: order.__typename === 'Order' ? { name: order.name } : null,
        unitPrice: decimalToMoney(lineItem.discountedUnitPriceSet.shopMoney.amount),
      });

      const lineItemPriceInfo = getLineItemPriceInformation(
        calculateWorkOrder.name ?? 'no work order',
        lineItem,
        items,
        hourlyLabourCharges,
        fixedPriceLabourCharges,
      );

      totalLineItemDiscount = addMoney(totalLineItemDiscount, lineItemPriceInfo.lineItemDiscount);

      if (order.__typename === 'Order') {
        appliedLineItemDiscount = addMoney(appliedLineItemDiscount, lineItemPriceInfo.lineItemDiscount);
      }

      assignMoneyDictionary(itemPrices, lineItemPriceInfo.itemPrices);
      assignMoneyDictionary(hourlyLabourChargePrices, lineItemPriceInfo.hourlyLabourChargePrices);
      assignMoneyDictionary(fixedPriceLabourChargePrices, lineItemPriceInfo.fixedPriceLabourChargePrices);

      warnings.push(...lineItemPriceInfo.warnings);
    }
  }

  const knownLineItemIds = new Set(orders.flatMap(order => order.lineItems.map(lineItem => lineItem.id)));
  const missingLineItemIds = [...items, ...hourlyLabourCharges, ...fixedPriceLabourCharges]
    .map(item => item.shopifyOrderLineItemId)
    .filter(isNonNullable)
    .map(lineItemId => {
      assertGid(lineItemId);
      return lineItemId;
    })
    .filter(lineItemId => !knownLineItemIds.has(lineItemId));

  if (missingLineItemIds.length > 0) {
    warnings.push(`${missingLineItemIds.length} line items were not found - excluding them from price calculations.`);
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
    hourlyLabourChargePrices,
    fixedPriceLabourChargePrices,

    itemLineItemIds,
    hourlyLabourChargeLineItemIds,
    fixedPriceLabourChargeLineItemIds,

    missingProductVariantIds,
    warnings,
  };
}

async function getExistingOrderInfo(session: Session, name: string) {
  const graphql = new Graphql(session);

  const itemLineItemIds: Record<string, ID> = {};
  const hourlyLabourChargeLineItemIds: Record<string, ID> = {};
  const fixedPriceLabourChargeLineItemIds: Record<string, ID> = {};

  const items: Pick<IGetItemsResult, 'shopifyOrderLineItemId' | 'uuid' | 'quantity' | 'absorbCharges'>[] = [];
  const hourlyLabourCharges: Pick<
    IGetHourlyLabourChargesResult,
    'shopifyOrderLineItemId' | 'uuid' | 'hours' | 'rate'
  >[] = [];
  const fixedPriceLabourCharges: Pick<
    IGetFixedPriceLabourChargesResult,
    'shopifyOrderLineItemId' | 'uuid' | 'amount'
  >[] = [];

  const warnings: string[] = [];

  const [workOrder] = await db.workOrder.get({ shop: session.shop, name });

  if (!workOrder) {
    throw new HttpError('Work order not found', 404);
  }

  const { id: workOrderId } = workOrder;

  const [databaseItems, databaseHourlyLabourCharges, databaseFixedLabourCharges] = await Promise.all([
    db.workOrder.getItems({ workOrderId }),
    db.workOrderCharges.getHourlyLabourCharges({ workOrderId }),
    db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId }),
  ]);

  const lineItemIds = new Set<ID>();

  for (const item of databaseItems) {
    if (isLineItemId(item.shopifyOrderLineItemId)) {
      lineItemIds.add(item.shopifyOrderLineItemId);

      itemLineItemIds[item.uuid] = item.shopifyOrderLineItemId;
      items.push({
        uuid: item.uuid,
        shopifyOrderLineItemId: item.shopifyOrderLineItemId,
        quantity: item.quantity,
        absorbCharges: item.absorbCharges,
      });
    }
  }

  for (const hourlyLabourCharge of databaseHourlyLabourCharges) {
    if (isLineItemId(hourlyLabourCharge.shopifyOrderLineItemId)) {
      lineItemIds.add(hourlyLabourCharge.shopifyOrderLineItemId);

      hourlyLabourChargeLineItemIds[hourlyLabourCharge.uuid] = hourlyLabourCharge.shopifyOrderLineItemId;
      hourlyLabourCharges.push({
        uuid: hourlyLabourCharge.uuid,
        shopifyOrderLineItemId: hourlyLabourCharge.shopifyOrderLineItemId,
        hours: hourlyLabourCharge.hours,
        rate: hourlyLabourCharge.rate,
      });
    }
  }

  for (const fixedLabourCharge of databaseFixedLabourCharges) {
    if (isLineItemId(fixedLabourCharge.shopifyOrderLineItemId)) {
      lineItemIds.add(fixedLabourCharge.shopifyOrderLineItemId);

      fixedPriceLabourChargeLineItemIds[fixedLabourCharge.uuid] = fixedLabourCharge.shopifyOrderLineItemId;
      fixedPriceLabourCharges.push({
        uuid: fixedLabourCharge.uuid,
        shopifyOrderLineItemId: fixedLabourCharge.shopifyOrderLineItemId,
        amount: fixedLabourCharge.amount,
      });
    }
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
    hourlyLabourCharges,
    fixedPriceLabourCharges,
    itemLineItemIds,
    hourlyLabourChargeLineItemIds,
    fixedPriceLabourChargeLineItemIds,
  };
}

type CalculatedDraftOrderWithFakeIds = NonNullable<
  Awaited<ReturnType<typeof getCalculatedDraftOrderInfo>>['calculatedDraftOrder']
>;

/**
 * Uses the `draftOrderCalculate` mutation and creates dictionaries mapping items/charges to line items.
 */
async function getCalculatedDraftOrderInfo(session: Session, calculateWorkOrder: CalculateWorkOrder) {
  const { shop } = session;
  const { labourLineItemSKU } = await getShopSettings(shop);

  const { items, charges, discount } = calculateWorkOrder;

  const hourlyLabourCharges = charges.filter(hasPropertyValue('type', 'hourly-labour'));
  const fixedPriceLabourCharges = charges.filter(hasPropertyValue('type', 'fixed-price-labour'));
  const { lineItems, customSales } = getWorkOrderLineItems(items, hourlyLabourCharges, fixedPriceLabourCharges, {
    labourSku: labourLineItemSKU,
  });

  const itemLineItemIds: Record<string, ID> = {};
  const hourlyLabourChargeLineItemIds: Record<string, ID> = {};
  const fixedPriceLabourChargeLineItemIds: Record<string, ID> = {};

  if (lineItems.length === 0 && customSales.length === 0) {
    return {
      calculatedDraftOrder: null,
      itemLineItemIds,
      hourlyLabourChargeLineItemIds,
      fixedPriceLabourChargeLineItemIds,
    };
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

  const calculatedDraftOrder = {
    ...result.draftOrderCalculate.calculatedDraftOrder,
    lineItems: result.draftOrderCalculate.calculatedDraftOrder.lineItems.map(lineItem => {
      // `draftOrderCalculate` does not give line items ids, but we need those to map between items/charges and line items.
      // so just create a random one
      const id = createGid('CalculatedDraftLineItem', uuid());

      for (const uuid of getUuidsFromCustomAttributes(lineItem.customAttributes)) {
        if (uuid.type === 'item') {
          itemLineItemIds[uuid.uuid] = id;
        } else if (uuid.type === 'hourly') {
          hourlyLabourChargeLineItemIds[uuid.uuid] = id;
        } else if (uuid.type === 'fixed') {
          fixedPriceLabourChargeLineItemIds[uuid.uuid] = id;
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
    hourlyLabourChargeLineItemIds,
    fixedPriceLabourChargeLineItemIds,

    items: items.map<WorkOrderItem>(item => ({
      shopifyOrderLineItemId:
        itemLineItemIds[item.uuid] ?? never('every item should be represented in the calculated draft order'),
      uuid: item.uuid,
      quantity: item.quantity,
      absorbCharges: item.absorbCharges,
    })),

    hourlyLabourCharges: charges
      .filter(hasPropertyValue('type', 'hourly-labour'))
      .map<WorkOrderHourlyLabourCharge>(charge => ({
        uuid: charge.uuid,
        shopifyOrderLineItemId:
          hourlyLabourChargeLineItemIds[charge.uuid] ??
          never('every hourly charge should be represented in the calculated draft order'),
        hours: charge.hours,
        rate: charge.rate,
      })),

    fixedPriceLabourCharges: charges
      .filter(hasPropertyValue('type', 'fixed-price-labour'))
      .map<WorkOrderFixedPriceLabourCharge>(charge => ({
        uuid: charge.uuid,
        shopifyOrderLineItemId:
          hourlyLabourChargeLineItemIds[charge.uuid] ??
          never('every fixed price charge should be represented in the calculated draft order'),
        amount: charge.amount,
      })),
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
      : order.appliedDiscount?.amountSet.shopMoney.amount ?? BigDecimal.ZERO.toDecimal(),
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
  xd: string,
  lineItem: (OrderWithAllLineItems | CalculatedDraftOrderWithFakeIds)['lineItems'][number],
  items: WorkOrderItem[],
  hourlyLabourCharges: WorkOrderHourlyLabourCharge[],
  fixedPriceLabourCharges: WorkOrderFixedPriceLabourCharge[],
) {
  const itemPrices: Record<string, Money> = {};
  const hourlyLabourChargePrices: Record<string, Money> = {};
  const fixedPriceLabourChargePrices: Record<string, Money> = {};

  const warnings: string[] = [];

  const discountedTotal = decimalToMoney(lineItem.discountedTotalSet.shopMoney.amount);
  const originalTotal = decimalToMoney(lineItem.originalTotalSet.shopMoney.amount);

  const lineItemDiscount = subtractMoney(originalTotal, discountedTotal);

  // next, we determine the price of every thing contained in this line item (items, charges, etc)

  const lineItemItems = items.filter(hasPropertyValue('shopifyOrderLineItemId', lineItem.id));
  const lineItemHourlyCharges = hourlyLabourCharges.filter(hasPropertyValue('shopifyOrderLineItemId', lineItem.id));
  const lineItemFixedCharges = fixedPriceLabourCharges.filter(hasPropertyValue('shopifyOrderLineItemId', lineItem.id));

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

  return { lineItemDiscount, itemPrices, hourlyLabourChargePrices, fixedPriceLabourChargePrices, warnings };
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

function assignMoneyDictionary(a: Record<string, Money>, b: Record<string, Money>) {
  for (const [key, value] of Object.entries(b)) {
    a[key] = addMoney(a[key] ?? ZERO_MONEY, value);
  }
}

function isLineItemId(id: string | null): id is ID {
  return id !== null && parseGid(id).objectName === 'LineItem';
}
