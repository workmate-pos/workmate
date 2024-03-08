import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { groupByKey } from '@teifi-digital/shopify-app-toolbox/array';

export type WorkOrderItem = {
  uuid: string;
  productVariantId: string;
  quantity: number;
};

export type BaseCharge = {
  uuid: string;
  name: string;
  workOrderItemUuid: string | null;
};

export type HourlyLabourCharge = BaseCharge & {
  hours: string;
  rate: string;
};

export type FixedPriceLabourCharge = BaseCharge & {
  amount: string;
};

export type LineItem = {
  productVariantId: ID;
  quantity: number;
  customAttributes: Record<string, string>;
};

export type CustomSale = {
  title: string;
  quantity: number;
  unitPrice: Money;
  customAttributes: Record<string, string>;
};

/**
 * Processes work order items and charges to create platform-agnostic shopify orders for work orders.
 * Automatically applies restrictions based on those present on POS to ensure consistency across all platforms.
 *
 * These restrictions are:
 * - One line item per product variant id.
 * - A unique title for each custom sale.
 */
export function getWorkOrderLineItems(
  items: WorkOrderItem[],
  hourlyLabourCharges: HourlyLabourCharge[],
  fixedPriceLabourCharges: FixedPriceLabourCharge[],
): { lineItems: LineItem[]; customSales: CustomSale[] } {
  const charges = [...fixedPriceLabourCharges, ...hourlyLabourCharges];

  // ensure charge names are unique by adding (count) to every duplicate name
  const chargesByName = groupByKey(charges, 'name');

  for (const charges of Object.values(chargesByName)) {
    if (charges.length === 1) {
      // no duplicates
      continue;
    }

    for (const [index, charge] of charges.entries()) {
      charge.name = `${charge.name} (${index + 1})`;
    }
  }

  // create line items
  const lineItemByVariantId: Record<ID, LineItem> = {};

  for (const { productVariantId, uuid, quantity } of items) {
    assertGid(productVariantId);

    const lineItem = (lineItemByVariantId[productVariantId] ??= {
      productVariantId,
      quantity: 0,
      customAttributes: {},
    });

    lineItem.quantity += quantity;
    lineItem.customAttributes[`${ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX}${uuid}`] = String(quantity);

    const linkedCharges = charges.filter(charge => charge.workOrderItemUuid === uuid);

    for (const charge of linkedCharges) {
      lineItem.customAttributes[charge.name] = uuid;
    }
  }

  // create custom sales
  const customSales = [
    ...hourlyLabourCharges.map(charge => ({ ...charge, type: 'hourly' }) as const),
    ...fixedPriceLabourCharges.map(charge => ({ ...charge, type: 'fixed' }) as const),
  ].map<CustomSale>(charge => {
    const quantity = 1;

    const prefix = {
      hourly: HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
      fixed: FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    }[charge.type];

    return {
      title: charge.name,
      customAttributes: {
        [`${prefix}${charge.uuid}`]: String(quantity),
        ...(charge.workOrderItemUuid !== null
          ? {
              _wm_linked_to_item_uuid: charge.workOrderItemUuid,
            }
          : {}),
      },
      quantity: quantity,
      unitPrice: getUnitPrice(charge),
    };
  });

  return {
    lineItems: Object.values(lineItemByVariantId),
    customSales,
  };
}

function getUnitPrice(charge: HourlyLabourCharge | FixedPriceLabourCharge): Money {
  if ('amount' in charge) {
    return BigDecimal.fromString(charge.amount).toMoney();
  }

  return BigDecimal.fromString(charge.hours).multiply(BigDecimal.fromString(charge.rate)).toMoney();
}

export const ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX = '_wm_item_uuid:';
export const HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX = '_wm_hourly_charge_uuid:';
export const FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX = '_wm_fixed_charge_uuid:';
export const WORK_ORDER_CUSTOM_ATTRIBUTE_NAME = 'Work Order';

export function getWorkOrderOrderCustomAttributes(workOrder: { name: string }) {
  return {
    [WORK_ORDER_CUSTOM_ATTRIBUTE_NAME]: workOrder.name,
  };
}

export function getCustomAttributeArrayFromObject(obj: Record<string, string>): { key: string; value: string }[] {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}
