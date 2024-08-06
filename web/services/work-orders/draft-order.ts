import {
  DateTime,
  DraftOrderInput,
  Int,
  PaymentTermsInput,
  PaymentTermsType,
  PurchasingEntityInput,
} from '../gql/queries/generated/schema.js';
import {
  FixedPriceLabourCharge,
  getCustomAttributeArrayFromObject,
  getWorkOrderLineItems,
  getWorkOrderOrderCustomAttributes,
  HourlyLabourCharge,
  WorkOrderCustomItem,
  WorkOrderItem,
  WorkOrderLabourCharge,
  WorkOrderProductItem,
} from '@work-orders/work-order-shopify-order';
import { getShopSettings } from '../settings.js';
import { db } from '../db/db.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertGidOrNull, isLineItemId } from '../../util/assertions.js';
import { getWorkOrderDiscount, getWorkOrderPaymentTerms } from './get.js';
import { getMailingAddressInputsForCompanyLocation } from '../draft-orders/util.js';
import { Session } from '@shopify/shopify-api';
import { gql } from '../gql/gql.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { IGetResult } from '../db/queries/generated/work-order.sql.js';
import { match, P } from 'ts-pattern';
import { httpError } from '../../util/http-error.js';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { identity } from '@teifi-digital/shopify-app-toolbox/functional';
import { WorkOrderDiscount } from './types.js';

export type SelectedItem = { type: 'product' | 'custom-item'; uuid: string };
export type SelectedCharge = { type: 'hourly-labour' | 'fixed-price-labour'; uuid: string };

/**
 * Plan an order for some items and charges of a work order.
 * Used to create draft orders, real orders, to populate the POS cart.
 * If no items/charges are selected, all existing unlinked items/charges will be included.
 * No items that are already in an order are ever included.
 */
export async function getDraftOrderInputForExistingWorkOrder(
  session: Session,
  workOrderName: string,
  options?: {
    selectedItems?: SelectedItem[];
    selectedCharges?: SelectedCharge[];
    newItems?: WorkOrderItem[];
    newCharges?: WorkOrderLabourCharge[];
  },
) {
  const [databaseWorkOrder] = await db.workOrder.get({
    shop: session.shop,
    name: workOrderName,
  });

  if (!databaseWorkOrder) {
    throw new HttpError('Work order not found', 404);
  }

  const {
    id: workOrderId,
    discountType,
    discountAmount,
    companyId,
    companyLocationId,
    companyContactId,
    customerId,
    note,
    paymentFixedDueDate,
    paymentTermsTemplateId,
  } = databaseWorkOrder;

  assertGid(customerId);
  assertGidOrNull(companyId);
  assertGidOrNull(companyLocationId);
  assertGidOrNull(companyContactId);

  const [{ labourLineItemSKU }, workOrder] = await Promise.all([
    getShopSettings(session.shop),
    awaitNested({
      customFields: db.workOrder.getCustomFields({ workOrderId }),
      items: db.workOrder.getItems({ workOrderId }),
      customItems: db.workOrder.getCustomItems({ workOrderId }),
      hourlyLabourCharges: db.workOrderCharges.getHourlyLabourCharges({ workOrderId }),
      fixedPriceLabourCharges: db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId }),
    }),
  ]);

  const availableItems = workOrder.items.filter(notInOrder).map(merge({ type: 'product' }));
  const availableCustomItems = workOrder.customItems.filter(notInOrder).map(merge({ type: 'custom-item' }));
  const availableHourlyCharges = workOrder.hourlyLabourCharges.filter(notInOrder).map(merge({ type: 'hourly-labour' }));
  const availableFixedPriceCharges = workOrder.fixedPriceLabourCharges
    .filter(notInOrder)
    .map(merge({ type: 'fixed-price-labour' }));

  const selectedItems = options?.selectedItems ?? [
    ...availableItems.map(item => ({ type: 'product', uuid: item.uuid }) as const),
    ...availableCustomItems.map(item => ({ type: 'custom-item', uuid: item.uuid }) as const),
  ];

  const selectedCharges = options?.selectedCharges ?? [
    ...availableHourlyCharges.map(charge => ({ type: 'hourly-labour', uuid: charge.uuid }) as const),
    ...availableFixedPriceCharges.map(charge => ({ type: 'fixed-price-labour', uuid: charge.uuid }) as const),
  ];

  const selectedWorkOrderItems = selectedItems.map(
    ({ type, uuid }) =>
      match(type)
        .with('product', () => availableItems.find(hasPropertyValue('uuid', uuid)))
        .with('custom-item', () => availableCustomItems.find(hasPropertyValue('uuid', uuid)))
        .exhaustive() ?? httpError('Item not found', 404),
  );

  const selectedWorkOrderCharges = selectedCharges.map(
    charge =>
      match(charge)
        .with({ type: 'hourly-labour' }, () => availableHourlyCharges.find(hasPropertyValue('uuid', charge.uuid)))
        .with({ type: 'fixed-price-labour' }, () =>
          availableFixedPriceCharges.find(hasPropertyValue('uuid', charge.uuid)),
        )
        .exhaustive() ?? httpError('Charge not found', 404),
  );

  const items = selectedWorkOrderItems.map(item => {
    return match(item)
      .returnType<WorkOrderItem>()
      .with({ type: 'product' }, (item): WorkOrderProductItem => {
        return pick(item, 'uuid', 'quantity', 'absorbCharges', 'type', 'productVariantId');
      })
      .with(
        { type: 'custom-item' },
        (item): WorkOrderCustomItem => pick(item, 'uuid', 'quantity', 'absorbCharges', 'type', 'name', 'unitPrice'),
      )
      .exhaustive();
  });

  const charges = selectedWorkOrderCharges.map(charge =>
    match(charge)
      .returnType<WorkOrderLabourCharge>()
      .with(
        { type: 'hourly-labour' },
        (labour): HourlyLabourCharge => ({
          ...pick(labour, 'type', 'uuid', 'name', 'hours', 'rate'),
          workOrderItem: getWorkOrderItem(labour),
        }),
      )
      .with(
        { type: 'fixed-price-labour' },
        (labour): FixedPriceLabourCharge => ({
          ...pick(labour, 'type', 'uuid', 'name', 'amount'),
          workOrderItem: getWorkOrderItem(labour),
        }),
      )
      .exhaustive(),
  );

  items.push(...(options?.newItems ?? []));
  charges.push(...(options?.newCharges ?? []));

  const discount = getWorkOrderDiscount({ discountType, discountAmount });

  return await getDraftOrderInputForWorkOrder(session, {
    items,
    workOrderName,
    customFields: workOrder.customFields,
    companyId,
    companyLocationId,
    companyContactId,
    customerId,
    paymentTerms: await getPaymentTerms(session, {
      id: workOrderId,
      companyId,
      paymentTermsTemplateId,
      paymentFixedDueDate,
    }),
    charges,
    discount,
    note,
  });
}

/**
 * General function to create a draft order for a work order.
 * Supports non-existent work orders.
 * When working with existing work orders, use {@link getDraftOrderInputForExistingWorkOrder} instead
 */
export async function getDraftOrderInputForWorkOrder(
  session: Session,
  {
    discount,
    note,
    workOrderName,
    customFields,
    companyId,
    companyLocationId,
    companyContactId,
    customerId,
    paymentTerms,
    items,
    charges,
  }: {
    discount: WorkOrderDiscount | null;
    note: string | null;
    workOrderName: string | null;
    customFields: { key: string; value: string }[] | null;
    companyId: ID | null;
    companyLocationId: ID | null;
    companyContactId: ID | null;
    paymentTerms: PaymentTermsInput | null;
    customerId: ID | null;
    items: WorkOrderItem[];
    charges: WorkOrderLabourCharge[];
  },
): Promise<DraftOrderInput> {
  workOrderName ??= 'Unnamed work order';

  // We must attach unit prices to products that absorb charges so we can calculate the quantity correctly
  const absorbingProductVariantIds = unique(
    items
      .filter(hasPropertyValue('absorbCharges', true))
      .filter(hasPropertyValue('type', 'product'))
      .map(item => {
        assertGid(item.productVariantId);
        return item.productVariantId;
      }),
  );

  const graphql = new Graphql(session);
  const [{ labourLineItemSKU }, { billingAddress, shippingAddress }, response] = await Promise.all([
    getShopSettings(session.shop),
    getMailingAddressInputsForCompanyLocation(session, companyLocationId),
    gql.products.getMany.run(graphql, { ids: absorbingProductVariantIds }),
  ]);

  const itemsWithUnitPrices = items.map(item => {
    if (!item.absorbCharges || item.type !== 'product') {
      return item;
    }

    const productVariantId = item.productVariantId;
    assertGid(productVariantId);

    return {
      ...item,
      unitPrice:
        response.nodes
          .filter(isNonNullable)
          .filter(hasPropertyValue('__typename', 'ProductVariant'))
          .find(hasPropertyValue('id', productVariantId))?.price ?? httpError('Product variant not found', 404),
    };
  });

  const { lineItems, customSales } = getWorkOrderLineItems(
    itemsWithUnitPrices.filter(hasPropertyValue('type', 'product')),
    itemsWithUnitPrices.filter(hasPropertyValue('type', 'custom-item')),
    charges.filter(hasPropertyValue('type', 'hourly-labour')),
    charges.filter(hasPropertyValue('type', 'fixed-price-labour')),
    {
      labourSku: labourLineItemSKU,
      workOrderName,
    },
  );

  return {
    customAttributes: getCustomAttributeArrayFromObject(
      getWorkOrderOrderCustomAttributes({
        name: workOrderName,
        customFields: Object.fromEntries(customFields?.map(({ key, value }) => [key, value]) ?? []),
      }),
    ),
    lineItems: [
      ...lineItems.map(lineItem => ({
        variantId: lineItem.productVariantId,
        quantity: lineItem.quantity as Int,
        customAttributes: getCustomAttributeArrayFromObject(lineItem.customAttributes),
      })),
      ...customSales.map(customSale => ({
        title: customSale.title,
        quantity: customSale.quantity as Int,
        customAttributes: getCustomAttributeArrayFromObject(customSale.customAttributes),
        originalUnitPrice: customSale.unitPrice,
        taxable: customSale.taxable,
      })),
    ],
    note,
    billingAddress,
    shippingAddress,
    purchasingEntity: match({ companyId, companyContactId, companyLocationId, customerId })
      .returnType<PurchasingEntityInput | null>()
      .with(
        {
          companyId: P.nonNullable.select('companyId'),
          companyContactId: P.nonNullable.select('companyContactId'),
          companyLocationId: P.nonNullable.select('companyLocationId'),
        },
        purchasingCompany => ({ purchasingCompany }),
      )
      .with({ customerId: P.nonNullable.select('customerId') }, identity)
      .otherwise(() => null),
    appliedDiscount: discount ? { value: Number(discount.value), valueType: discount.type } : null,
    paymentTerms,
    reserveInventoryUntil: null,
  };
}

async function getPaymentTerms(
  session: Session,
  workOrder: Pick<IGetResult, 'id' | 'companyId' | 'paymentTermsTemplateId' | 'paymentFixedDueDate'>,
): Promise<PaymentTermsInput | null> {
  const paymentTerms = getWorkOrderPaymentTerms(workOrder);

  if (paymentTerms === null || paymentTerms.templateId === null || workOrder.companyId === null) {
    return null;
  }

  const [isNet, isFixed] = await Promise.all([
    isPaymentTermTemplateType(session, paymentTerms.templateId, 'NET'),
    isPaymentTermTemplateType(session, paymentTerms.templateId, 'FIXED'),
  ]);

  return {
    paymentTermsTemplateId: paymentTerms.templateId,
    paymentSchedules: [
      {
        issuedAt: isNet ? (new Date().toISOString() as DateTime) : null,
        dueAt: isFixed ? paymentTerms.date : null,
      },
    ],
  };
}

async function isPaymentTermTemplateType(session: Session, templateId: ID, type: PaymentTermsType) {
  const graphql = new Graphql(session);
  const { paymentTermsTemplates } = await gql.paymentTerms.getTemplates.run(graphql, { type });
  return paymentTermsTemplates.some(hasPropertyValue('id', templateId));
}

function notInOrder(item: { shopifyOrderLineItemId: string | null }) {
  return !isLineItemId(item.shopifyOrderLineItemId);
}

function merge<const A>(a: A) {
  return <const B>(b: B) => ({ ...a, ...b });
}

/**
 * Create a nice object referencing which item a charge is linked to + the necessary assertions
 */
export function getWorkOrderItem(charge: { workOrderItemUuid: string | null; workOrderCustomItemUuid: string | null }) {
  return match(charge)
    .returnType<{ uuid: string; type: 'product' | 'custom-item' } | null>()
    .with({ workOrderCustomItemUuid: P.nonNullable, workOrderItemUuid: P.nonNullable }, () =>
      httpError('Invalid charge - cannot be linked to product item and custom item at the same time', 500),
    )
    .with({ workOrderItemUuid: P.nullish, workOrderCustomItemUuid: P.nullish }, () => null)
    .with({ workOrderCustomItemUuid: P.string.select('uuid') }, merge({ type: 'custom-item' }))
    .with({ workOrderItemUuid: P.string.select('uuid') }, merge({ type: 'product' }))
    .exhaustive();
}
