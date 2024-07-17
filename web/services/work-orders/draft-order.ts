import { DraftOrderInput, Int } from '../gql/queries/generated/schema.js';
import {
  getCustomAttributeArrayFromObject,
  getWorkOrderLineItems,
  getWorkOrderOrderCustomAttributes,
} from '@work-orders/work-order-shopify-order';
import { getShopSettings } from '../settings.js';
import { db } from '../db/db.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { assertGid, ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertGidOrNull } from '../../util/assertions.js';
import { getWorkOrderDiscount } from './get.js';
import { getMailingAddressInputsForCompanyLocation } from '../draft-orders/util.js';
import { Session } from '@shopify/shopify-api';
import { gql } from '../gql/gql.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export async function getWorkOrderDraftOrderInput(
  session: Session,
  workOrderId: number,
  options?: {
    mustHaveUnlinkedItems?: boolean;
    items?: { type: 'product' | 'custom-item'; uuid: string }[];
    charges?: { type: 'hourly-labour' | 'fixed-price-labour'; uuid: string }[];
  },
): Promise<DraftOrderInput | null> {
  const [
    { labourLineItemSKU },
    [workOrder],
    customFields,
    items,
    customItems,
    hourlyLabourCharges,
    fixedPriceLabourCharges,
  ] = await Promise.all([
    getShopSettings(session.shop),
    db.workOrder.getById({ id: workOrderId }),
    db.workOrder.getCustomFields({ workOrderId }),
    db.workOrder.getItems({ workOrderId }),
    db.workOrder.getCustomItems({ workOrderId }),
    db.workOrderCharges.getHourlyLabourCharges({ workOrderId }),
    db.workOrderCharges.getFixedPriceLabourCharges({ workOrderId }),
  ]);

  if (!workOrder) {
    throw new HttpError(`Work order with id ${workOrderId} not found`, 404);
  }

  if (options?.mustHaveUnlinkedItems) {
    const hasUnlinkedItems = [...items, ...hourlyLabourCharges, ...fixedPriceLabourCharges].some(
      el => el.shopifyOrderLineItemId === null,
    );

    if (!hasUnlinkedItems) {
      return null;
    }
  }

  const graphql = new Graphql(session);

  assertGid(workOrder.customerId);

  const { customer } = await gql.customer.get.run(graphql, { id: workOrder.customerId });
  const customerId = customer?.id ?? null;

  const { companyId, companyLocationId, companyContactId } = workOrder;

  assertGidOrNull(companyId);
  assertGidOrNull(companyLocationId);
  assertGidOrNull(companyContactId);

  const lineItemToLinkFilter = (type: 'product' | 'custom-item' | 'hourly-labour' | 'fixed-price-labour') => {
    const uuids = {
      product: options?.items?.filter(hasPropertyValue('type', 'product')).map(item => item.uuid),
      'custom-item': options?.items?.filter(hasPropertyValue('type', 'custom-item')).map(item => item.uuid),
      'hourly-labour': options?.charges?.filter(hasPropertyValue('type', 'hourly-labour')).map(item => item.uuid),
      'fixed-price-labour': options?.charges
        ?.filter(hasPropertyValue('type', 'fixed-price-labour'))
        .map(item => item.uuid),
    }[type];

    return (el: { uuid: string; shopifyOrderLineItemId: string | null }) =>
      !isLineItemId(el.shopifyOrderLineItemId) && (!uuids || uuids.includes(el.uuid));
  };

  const draftItems = items.filter(lineItemToLinkFilter('product'));
  const draftCustomItems = customItems.filter(lineItemToLinkFilter('custom-item'));
  const draftHourlyLabourCharges = hourlyLabourCharges.filter(lineItemToLinkFilter('hourly-labour'));
  const draftFixedPriceLabourCharges = fixedPriceLabourCharges.filter(lineItemToLinkFilter('fixed-price-labour'));

  const mapWorkOrderItem = <T extends { workOrderItemUuid: string | null; workOrderCustomItemUuid: string | null }>(
    charge: T,
  ) => {
    const { workOrderCustomItemUuid, workOrderItemUuid, ...rest } = charge;

    if (workOrderItemUuid && workOrderCustomItemUuid) {
      // impossible by design of create-work-order.json
      throw new Error('Cannot have both workOrderItemUuid and workOrderCustomItemUuid');
    }

    let workOrderItem = null;

    if (workOrderItemUuid) {
      workOrderItem = { type: 'product', uuid: workOrderItemUuid } as const;
    } else if (workOrderCustomItemUuid) {
      workOrderItem = { type: 'custom-item', uuid: workOrderCustomItemUuid } as const;
    }

    return {
      ...charge,
      workOrderItem,
    };
  };

  const { lineItems, customSales } = getWorkOrderLineItems(
    draftItems,
    draftCustomItems,
    draftHourlyLabourCharges.map(mapWorkOrderItem),
    draftFixedPriceLabourCharges.map(mapWorkOrderItem),
    { labourSku: labourLineItemSKU, workOrderName: workOrder.name },
  );

  const discount = getWorkOrderDiscount(workOrder);

  const { billingAddress = null, shippingAddress = null } = companyLocationId
    ? await getMailingAddressInputsForCompanyLocation(session, companyLocationId)
    : {};

  return {
    customAttributes: getCustomAttributeArrayFromObject(
      getWorkOrderOrderCustomAttributes({
        name: workOrder.name,
        customFields: Object.fromEntries(customFields.map(({ key, value }) => [key, value])),
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
    note: workOrder.note,
    billingAddress,
    shippingAddress,
    purchasingEntity:
      companyId && companyContactId && companyLocationId
        ? { purchasingCompany: { companyId, companyContactId, companyLocationId } }
        : customerId
          ? { customerId }
          : null,
    appliedDiscount: discount ? { value: Number(discount.value), valueType: discount.type } : null,
  };
}

function isLineItemId(id: string | null): id is ID {
  return id !== null && parseGid(id).objectName === 'LineItem';
}
