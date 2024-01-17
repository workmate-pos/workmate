import { Session } from '@shopify/shopify-api';
import type { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { db } from '../db/db.js';
import {
  AttributeInput,
  DraftOrderAppliedDiscountInput,
  DraftOrderInput,
  DraftOrderLineItemInput,
  ID,
  Int,
  Money,
  OrderInput,
} from '../gql/queries/generated/schema.js';
import { never } from '@work-orders/common/util/never.js';
import { getFormattedId } from '../id-formatting.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { Cents, Dollars, parseMoney, toCents, toDollars, toMoney } from '@work-orders/common/util/money.js';
import { getShopSettings } from '../settings.js';
import { WORK_ORDER_TAG } from '../../constants/tags.js';
import { gql } from '../gql/gql.js';
import { findSoleTruth } from '../../util/choice.js';
import { unit } from '../db/unit-of-work.js';
import { unique } from '@work-orders/common/util/array.js';
import { attributesToArray } from '@work-orders/common/custom-attributes/mapping/index.js';
import { WorkOrderOrderAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order.js';
import { WorkOrderOrderLineItemAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order-line-item.js';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { Nullable } from '@work-orders/common/types/Nullable.js';

export async function upsertWorkOrder(session: Session, createWorkOrder: CreateWorkOrder) {
  return await unit(async () => {
    const settings = await getShopSettings(session.shop);

    if (!settings.statuses.includes(createWorkOrder.status)) {
      throw new Error(`Invalid status: ${createWorkOrder.status}`);
    }

    const isNew = createWorkOrder.name === null;
    const [currentWorkOrder] = isNew ? [] : await db.workOrder.get({ shop: session.shop, name: createWorkOrder.name });

    if (!isNew && !currentWorkOrder) {
      throw new Error('Invalid work order name');
    }

    const [{ id, name: workOrderName } = never()] = await db.workOrder.upsert({
      shop: session.shop,
      name: createWorkOrder.name ?? (await getFormattedId(session.shop)),
      status: createWorkOrder.status,
      customerId: createWorkOrder.customerId,
      dueDate: new Date(createWorkOrder.dueDate),
      derivedFromOrderId: createWorkOrder.derivedFromOrderId,
      orderId: currentWorkOrder?.orderId ?? null,
      draftOrderId: currentWorkOrder?.draftOrderId ?? null,
    });

    const employeeRates = await getEmployeeRates(session.shop, createWorkOrder);

    await db.employeeAssignment.remove({ shop: session.shop, name: workOrderName });

    if (createWorkOrder.employeeAssignments.length) {
      await db.employeeAssignment.upsertMany({
        shop: session.shop,
        name: workOrderName,
        assignments: createWorkOrder.employeeAssignments.map(({ employeeId, hours, lineItemUuid }) => ({
          employeeId,
          hours,
          productVariantId: lineItemUuid
            ? createWorkOrder.lineItems.find(lineItem => lineItem.uuid === lineItemUuid)?.productVariantId ??
              never('Invalid lineItemUuid in employeeAssignment')
            : null,
          lineItemUuid,
          rate: employeeRates[employeeId] ?? never('getEmployeeRates should return rates for all assigned employees'),
        })),
      });
    }

    let draftOrderId: ID | null = null;
    let orderId: ID | null = null;

    const orderIdSet = !!currentWorkOrder?.orderId;

    const action = findSoleTruth({
      upsertDraftOrder: !orderIdSet,
      updateOrder: orderIdSet,
    });

    const options = await getOrderOptions(session.shop);

    switch (action) {
      case 'upsertDraftOrder': {
        const draftOrder = await upsertDraftOrder(
          session,
          workOrderName,
          createWorkOrder,
          options,
          employeeRates,
          (currentWorkOrder?.draftOrderId ?? undefined) as ID | undefined,
        );
        draftOrderId = draftOrder.id;
        break;
      }

      case 'updateOrder': {
        const order = await updateOrder(
          session,
          workOrderName,
          createWorkOrder,
          options,
          employeeRates,
          (currentWorkOrder?.orderId ?? never()) as ID,
        );
        orderId = order.id;
        break;
      }

      default:
        return action satisfies never;
    }

    await db.workOrder.updateOrderIds({
      id,
      orderId,
      draftOrderId,
    });

    return { name: workOrderName };
  });
}

async function upsertDraftOrder(
  session: Session,
  workOrderName: string,
  createWorkOrder: CreateWorkOrder,
  options: OrderOptions,
  employeeRates: EmployeeRates,
  draftOrderId?: ID,
) {
  const graphql = new Graphql(session);
  const input = getOrderInput(workOrderName, createWorkOrder, options, employeeRates);

  const { result } = draftOrderId
    ? await gql.draftOrder.update.run(graphql, { id: draftOrderId, input })
    : await gql.draftOrder.create.run(graphql, { input });

  if (!result) {
    throw new Error('Invalid result');
  }

  if (result.userErrors.length) {
    throw new Error(result.userErrors.map(e => `${e.field}: ${e.message}`).join('\n'));
  }

  return result.draftOrder ?? never();
}

async function updateOrder(
  session: Session,
  workOrderName: string,
  createWorkOrder: CreateWorkOrder,
  options: OrderOptions,
  employeeRates: EmployeeRates,
  orderId: ID,
) {
  const graphql = new Graphql(session);
  const input = getOrderInput(workOrderName, createWorkOrder, options, employeeRates);

  const result = await gql.order.update
    .run(graphql, {
      input: {
        id: orderId,
        tags: input.tags,
        customAttributes: input.customAttributes,
        note: input.note,
      },
    })
    .then(r => r.orderUpdate);

  if (!result) {
    throw new Error('Invalid result');
  }

  if (result.userErrors.length) {
    throw new Error(result.userErrors.map(e => `${e.field}: ${e.message}`).join('\n'));
  }

  return result.order ?? never();
}

type OrderOptions = {
  labourLineItemName: string;
  labourLineItemSKU: string;
};

async function getOrderOptions(shop: string): Promise<OrderOptions> {
  const { labourLineItemName, labourLineItemSKU } = await getShopSettings(shop);
  return { labourLineItemName, labourLineItemSKU };
}

type EmployeeRates = Record<ID, Cents>;

async function getEmployeeRates(
  shop: string,
  createWorkOrder: Pick<CreateWorkOrder, 'employeeAssignments'>,
): Promise<EmployeeRates> {
  const { defaultRate } = await getShopSettings(shop);

  const employeeIds = unique(createWorkOrder.employeeAssignments.map(e => e.employeeId));
  const employeeRates = employeeIds.length ? await db.employeeRate.getMany({ shop, employeeIds }) : [];

  return Object.fromEntries(
    employeeIds.map(employeeId => {
      const rate = employeeRates.find(employee => employee.employeeId === employeeId)?.rate;
      return [employeeId as ID, rate ? (rate as Cents) : toCents(parseMoney(defaultRate))];
    }),
  );
}

export async function calculateDraftOrder(session: Session, calculateWorkOrder: CalculateWorkOrder) {
  const graphql = new Graphql(session);
  const options = await getOrderOptions(session.shop);
  const employeeRates = await getEmployeeRates(session.shop, calculateWorkOrder);
  const input = getOrderInput('calculate', { ...calculateWorkOrder, description: '' }, options, employeeRates);

  const result = await gql.draftOrder.calculate.run(graphql, { input }).then(r => r.draftOrderCalculate);

  if (!result) {
    throw new Error('Invalid result');
  }

  if (result.userErrors.length) {
    throw new Error(result.userErrors.map(e => `${e.field}: ${e.message}`).join('\n'));
  }

  const { totalPrice, totalShippingPrice, totalTax, subtotalPrice, appliedDiscount } =
    result.calculatedDraftOrder ?? never();

  return {
    totalPrice,
    totalShippingPrice,
    totalTax,
    subtotalPrice,
    appliedDiscount,
  };
}

function getOrderInput(
  workOrderName: string,
  createWorkOrder: Pick<CreateWorkOrder, 'employeeAssignments' | 'lineItems' | 'discount' | 'description'> &
    Nullable<Pick<CreateWorkOrder, 'customerId'>>,
  options: OrderOptions,
  employeeRates: EmployeeRates,
): DraftOrderInput & Omit<OrderInput, 'id'> {
  return {
    customAttributes: getOrderAttributes(workOrderName),
    lineItems: getOrderLineItems(createWorkOrder, options, employeeRates),
    appliedDiscount: getOrderDiscount(createWorkOrder),
    // TODO: Shipping
    purchasingEntity: createWorkOrder.customerId ? { customerId: createWorkOrder.customerId } : null,
    tags: [WORK_ORDER_TAG],
    note: createWorkOrder.description,
  };
}

/**
 * Converts the line items inside a {@link CreateWorkOrder} DTO into line items for a (Draft) Order.
 * Includes a line item for labour, if applicable
 */
function getOrderLineItems(
  createWorkOrder: Pick<CreateWorkOrder, 'lineItems' | 'employeeAssignments'>,
  options: OrderOptions,
  employeeRates: EmployeeRates,
): DraftOrderLineItemInput[] {
  const lineItems: DraftOrderLineItemInput[] = [];

  for (const { productVariantId, quantity, uuid } of createWorkOrder.lineItems) {
    lineItems.push({
      variantId: productVariantId,
      quantity,
      customAttributes: getLineItemAttributes({ uuid }),
    });
  }

  for (const { employeeId, hours, lineItemUuid } of createWorkOrder.employeeAssignments) {
    const rate = employeeRates[employeeId] ?? never('EmployeeRates should already fall back to the default rate');
    const total = (toDollars(rate) * hours) as Dollars;

    lineItems.push({
      title: options.labourLineItemName,
      sku: options.labourLineItemSKU,
      taxable: true,
      requiresShipping: false,
      quantity: 1 as Int,
      originalUnitPrice: toMoney(total),
      customAttributes: getLineItemAttributes({
        labourLineItemUuid: lineItemUuid || undefined,
        sku: options.labourLineItemSKU || undefined,
      }),
    });
  }

  if (lineItems.length === 0) {
    // Draft orders are not allowed to be empty, so add this...
    // Will be overridden when a line item is added
    lineItems.push({
      title: 'Empty Order',
      originalUnitPrice: '0.00' as Money,
      taxable: false,
      requiresShipping: false,
      quantity: 1 as Int,
      customAttributes: getLineItemAttributes({ isPlaceholder: true }),
    });
  }

  return lineItems;
}

function getOrderDiscount(createWorkOrder: Pick<CreateWorkOrder, 'discount'>): DraftOrderAppliedDiscountInput | null {
  if (!createWorkOrder.discount) {
    return null;
  }

  return {
    value: createWorkOrder.discount.value,
    valueType: createWorkOrder.discount.valueType,
  };
}

function getOrderAttributes(workOrderName: string): AttributeInput[] {
  return attributesToArray(WorkOrderOrderAttributesMapping, {
    workOrder: workOrderName,
  });
}

function getLineItemAttributes({
  isPlaceholder = false,
  labourLineItemUuid,
  sku,
  uuid,
}: {
  labourLineItemUuid?: string;
  isPlaceholder?: boolean;
  sku?: string;
  uuid?: string;
}): AttributeInput[] {
  return attributesToArray(WorkOrderOrderLineItemAttributesMapping, {
    placeholderLineItem: isPlaceholder || null,
    labourLineItemUuid: labourLineItemUuid ?? null,
    sku: sku ?? null,
    uuid: uuid ?? null,
  });
}
