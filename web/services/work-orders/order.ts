import type { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
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
import { WORK_ORDER_TAG } from '../../constants/tags.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { getShopSettings } from '../settings.js';
import { attributesToArray } from '@work-orders/common/custom-attributes/mapping/index.js';
import { gql } from '../gql/gql.js';
import { Nullable } from '@work-orders/common/types/Nullable.js';
import { WorkOrderOrderAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order.js';
import { WorkOrderOrderLineItemAttributesMapping } from '@work-orders/common/custom-attributes/mapping/work-order-order-line-item.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export async function upsertDraftOrder(
  session: Session,
  workOrderName: string,
  createWorkOrder: CreateWorkOrder,
  options: OrderOptions,
  draftOrderId?: ID,
) {
  const graphql = new Graphql(session);
  const input = getOrderInput(workOrderName, createWorkOrder, options);

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

export async function updateOrder(
  session: Session,
  workOrderName: string,
  createWorkOrder: CreateWorkOrder,
  options: OrderOptions,
  orderId: ID,
) {
  const graphql = new Graphql(session);
  const input = getOrderInput(workOrderName, createWorkOrder, options);

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

export async function getOrderOptions(shop: string): Promise<OrderOptions> {
  const { labourLineItemName, labourLineItemSKU } = await getShopSettings(shop);
  return { labourLineItemName, labourLineItemSKU };
}

export function getOrderInput(
  workOrderName: string,
  createWorkOrder: Pick<CreateWorkOrder, 'labour' | 'lineItems' | 'discount' | 'description'> &
    Nullable<Pick<CreateWorkOrder, 'customerId'>>,
  options: OrderOptions,
): DraftOrderInput & Omit<OrderInput, 'id'> {
  return {
    customAttributes: getOrderAttributes(workOrderName),
    lineItems: getOrderLineItems(createWorkOrder, options),
    appliedDiscount: getOrderDiscount(createWorkOrder),
    // TODO: Shipping
    purchasingEntity: createWorkOrder.customerId ? { customerId: createWorkOrder.customerId } : null,
    tags: [WORK_ORDER_TAG],
    note: createWorkOrder.description,
  };
}

/**
 * Converts the line items inside a {@link CreateWorkOrder} DTO into line items for a (Draft) Order.
 * Includes line items for labour, if applicable
 */
function getOrderLineItems(
  createWorkOrder: Pick<CreateWorkOrder, 'labour' | 'lineItems'>,
  options: OrderOptions,
): DraftOrderLineItemInput[] {
  const lineItems: DraftOrderLineItemInput[] = [];

  for (const { productVariantId, quantity, uuid } of createWorkOrder.lineItems) {
    lineItems.push({
      variantId: productVariantId,
      quantity,
      customAttributes: getLineItemAttributes({ uuid }),
    });
  }

  for (const labour of createWorkOrder.labour) {
    let price: Money;

    if (labour.type === 'hourly-labour') {
      price = BigDecimal.fromMoney(labour.rate).multiply(BigDecimal.fromDecimal(labour.hours)).round(2n).toMoney();
    } else if (labour.type === 'fixed-price-labour') {
      price = labour.amount;
    } else {
      return labour satisfies never;
    }

    lineItems.push({
      sku: options.labourLineItemSKU,
      taxable: true,
      requiresShipping: false,
      quantity: 1 as Int,

      title: labour.name,
      originalUnitPrice: price,
      customAttributes: getLineItemAttributes({
        labourLineItemUuid: labour.lineItemUuid || undefined,
        sku: options.labourLineItemSKU || undefined,
      }),
    });
  }

  if (lineItems.length === 0) {
    // Draft orders are not allowed to be empty, so add this...
    // Will be removed again when a line item is added
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
    value: Number(BigDecimal.fromString(createWorkOrder.discount.value).toString()),
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
