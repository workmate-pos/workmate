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
import { BigDecimal, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProductVariants } from './product-variants.js';
import { getChargePrice } from './charges.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services/sentry.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';

export async function upsertDraftOrder(
  session: Session,
  workOrderName: string,
  createWorkOrder: CreateWorkOrder,
  options: OrderOptions,
  draftOrderId?: ID,
) {
  const graphql = new Graphql(session);
  const productVariants = await getProductVariants(session, createWorkOrder);
  const input = getOrderInput(workOrderName, createWorkOrder, options, productVariants);

  const { result } = draftOrderId
    ? await gql.draftOrder.update.run(graphql, { id: draftOrderId, input })
    : await gql.draftOrder.create.run(graphql, { input });

  if (!result) {
    sentryErr('Draft order upsert failed - no result', { result });
    throw new HttpError('Error saving draft order', 500);
  }

  if (result.userErrors.length) {
    sentryErr('Draft order upsert failed - user errors', { userErrors: result.userErrors });
    throw new HttpError('Error saving draft order', 500);
  }

  if (!result.draftOrder) {
    sentryErr('Draft order upsert failed - no body', { result });
    throw new HttpError('Error saving draft order', 500);
  }

  return result.draftOrder;
}

export async function updateOrder(
  session: Session,
  workOrderName: string,
  createWorkOrder: CreateWorkOrder,
  options: OrderOptions,
  orderId: ID,
) {
  const graphql = new Graphql(session);
  const productVariants = await getProductVariants(session, createWorkOrder);
  const input = getOrderInput(workOrderName, createWorkOrder, options, productVariants);

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
    sentryErr('Order update failed - no result', { result });
    throw new HttpError('Error saving order', 500);
  }

  if (result.userErrors.length) {
    sentryErr('Order update failed - user errors', { userErrors: result.userErrors });
    throw new HttpError('Error saving order', 500);
  }

  if (!result.order) {
    sentryErr('Order update failed - no body', { result });
    throw new HttpError('Error saving order', 500);
  }

  return result.order;
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
  createWorkOrder: Pick<CreateWorkOrder, 'charges' | 'lineItems' | 'discount' | 'description'> &
    Nullable<Pick<CreateWorkOrder, 'customerId'>>,
  options: OrderOptions,
  productVariants: Record<ID, gql.products.ProductVariantFragment.Result>,
): DraftOrderInput & Omit<OrderInput, 'id'> {
  return {
    customAttributes: getOrderAttributes(workOrderName),
    lineItems: getOrderLineItems(createWorkOrder, options, productVariants),
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
  createWorkOrder: Pick<CreateWorkOrder, 'charges' | 'lineItems'>,
  options: OrderOptions,
  productVariants: Record<ID, gql.products.ProductVariantFragment.Result>,
): DraftOrderLineItemInput[] {
  const lineItems: DraftOrderLineItemInput[] = [];

  for (const lineItem of createWorkOrder.lineItems) {
    const { productVariantId, uuid } = lineItem;
    let { quantity } = lineItem;

    const productVariant = productVariants[productVariantId] ?? never();
    const isMutableServiceItem = productVariant.product.isMutableServiceItem;

    // mutable service items do not have charge line items, but use the quantity to set the total price
    if (isMutableServiceItem) {
      const unitPrice = productVariant.price;
      const charges = createWorkOrder.charges.filter(hasPropertyValue('lineItemUuid', uuid));
      const totalPrice = BigDecimal.sum(
        ...charges.map(charge => BigDecimal.fromMoney(getChargePrice(charge))),
      ).toMoney();
      quantity = parseInt(
        BigDecimal.max(
          BigDecimal.ONE,
          BigDecimal.fromMoney(totalPrice).divide(BigDecimal.fromMoney(unitPrice), 2).round(0, RoundingMode.CEILING),
        ).toString(),
      ) as Int;
    }

    lineItems.push({
      variantId: productVariantId,
      quantity,
      customAttributes: getLineItemAttributes({ uuid }),
    });
  }

  for (const charge of createWorkOrder.charges) {
    if (charge.lineItemUuid) {
      const lineItem = createWorkOrder.lineItems.find(hasPropertyValue('uuid', charge.lineItemUuid));
      const productVariant = lineItem?.productVariantId ? productVariants[lineItem?.productVariantId] : undefined;
      const isMutableServiceItem = productVariant?.product.isMutableServiceItem;
      if (isMutableServiceItem) {
        // mutable service items do not have charge line items, but are included in the quantity of the service item
        continue;
      }
    }

    lineItems.push({
      sku: options.labourLineItemSKU,
      taxable: true,
      requiresShipping: false,
      quantity: 1 as Int,
      title: charge.name,
      originalUnitPrice: getChargePrice(charge),
      customAttributes: getLineItemAttributes({
        chargeLineItemUuid: charge.lineItemUuid || undefined,
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
  chargeLineItemUuid,
  sku,
  uuid,
}: {
  chargeLineItemUuid?: string;
  isPlaceholder?: boolean;
  sku?: string;
  uuid?: string;
}): AttributeInput[] {
  return attributesToArray(WorkOrderOrderLineItemAttributesMapping, {
    placeholderLineItem: isPlaceholder || null,
    chargeLineItemUuid: chargeLineItemUuid ?? null,
    sku: sku ?? null,
    uuid: uuid ?? null,
  });
}
