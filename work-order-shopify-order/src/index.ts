// TODO: Move to common

import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { BigDecimal, Money, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { groupByKey } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';

export type WorkOrderItem = {
  uuid: string;
  productVariantId: string;
  quantity: number;
  /**
   * When charges are absorbed, the line item for this item will adjust its quantity such that the price covers
   * all linked charges. The charges will not have their own line item.
   * This is used for mutable services, i.e. services that don't have a fixed price.
   * This assumes that the price of the product is 1.00.
   * The item quantity does not change the line item quantity, but is reported as-is in the custom attribute.
   */
  absorbCharges: boolean;
};

type BaseCharge = {
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
 *
 * Also allows including custom sales inside product line items by adjusting the quantity.
 */
export function getWorkOrderLineItems(
  items: WorkOrderItem[],
  hourlyLabourCharges: HourlyLabourCharge[],
  fixedPriceLabourCharges: FixedPriceLabourCharge[],
  options: { labourSku: string },
): { lineItems: LineItem[]; customSales: CustomSale[] } {
  const charges = [...fixedPriceLabourCharges, ...hourlyLabourCharges];

  // ensure charge names are unique by adding "(count)" to every duplicate name
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

  for (const item of items) {
    const { uuid, productVariantId, quantity } = item;

    assertGid(productVariantId);

    const lineItem = (lineItemByVariantId[productVariantId] ??= {
      productVariantId,
      quantity,
      customAttributes: {},
    });

    if (item.absorbCharges) {
      const absorbedHourlyCharges = hourlyLabourCharges.filter(hasPropertyValue('workOrderItemUuid', uuid));
      const absorbedFixedCharges = fixedPriceLabourCharges.filter(hasPropertyValue('workOrderItemUuid', uuid));

      const absorbedCharges = [
        ...absorbedHourlyCharges.map(charge => ({ ...charge, type: 'hourly' }) as const),
        ...absorbedFixedCharges.map(charge => ({ ...charge, type: 'fixed' }) as const),
      ];

      const totalChargeCost = BigDecimal.sum(
        ...absorbedCharges.map(getChargeUnitPrice).map(money => BigDecimal.fromMoney(money)),
      );

      // if we absorb charges we should override, as it is assumed that the product is a service with price 1.00
      lineItem.quantity = Number(totalChargeCost.round(0, RoundingMode.CEILING).toString());

      for (const absorbedCharge of absorbedCharges) {
        const quantity = 1;
        const chargeCustomAttributes = getChargeCustomAttributes(absorbedCharge, options, quantity);
        for (const [key, value] of Object.entries(chargeCustomAttributes)) {
          lineItem.customAttributes[getAbsorbedChargeCustomAttributeKey(absorbedCharge, key)] = value;
        }
      }
    }

    lineItem.customAttributes[`${ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX}${uuid}`] = String(item.quantity);

    const linkedCharges = charges.filter(charge => charge.workOrderItemUuid === uuid);

    // Add the linked charge name and prices to the item to make it readable for customers.
    for (const charge of linkedCharges) {
      lineItem.customAttributes[charge.name] = getChargeUnitPrice(charge);
    }
  }

  // create custom sales
  const customSales = [
    ...hourlyLabourCharges.map(charge => ({ ...charge, type: 'hourly' }) as const),
    ...fixedPriceLabourCharges.map(charge => ({ ...charge, type: 'fixed' }) as const),
  ]
    .map<CustomSale | null>(charge => {
      const linkedToItem = items.find(item => item.uuid === charge.workOrderItemUuid);
      const isAbsorbed = linkedToItem?.absorbCharges ?? false;

      if (isAbsorbed) {
        return null;
      }

      const quantity = 1;

      return {
        customAttributes: getChargeCustomAttributes(charge, options, quantity),
        unitPrice: getChargeUnitPrice(charge),
        title: charge.name,
        quantity,
      };
    })
    .filter(isNonNullable);

  return {
    lineItems: Object.values(lineItemByVariantId),
    customSales,
  };
}

function getChargeUnitPrice(charge: HourlyLabourCharge | FixedPriceLabourCharge): Money {
  if ('amount' in charge) {
    return BigDecimal.fromString(charge.amount).round(2, RoundingMode.CEILING).toMoney();
  }

  return BigDecimal.fromString(charge.hours)
    .multiply(BigDecimal.fromString(charge.rate))
    .round(2, RoundingMode.CEILING)
    .toMoney();
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

function getChargeCustomAttributes(
  charge: ({ type: 'hourly' } & HourlyLabourCharge) | ({ type: 'fixed' } & FixedPriceLabourCharge),
  options: { labourSku: string },
  quantity: number,
): Record<string, string> {
  const skuCustomAttribute = {
    hourly: options.labourSku,
    fixed: options.labourSku,
  }[charge.type];

  return {
    [getChargeUuidCustomAttributeKey(charge)]: String(quantity),
    ...(charge.workOrderItemUuid !== null
      ? {
          _wm_linked_to_item_uuid: charge.workOrderItemUuid,
        }
      : {}),
    ...(!!skuCustomAttribute
      ? {
          _wm_sku: skuCustomAttribute,
        }
      : {}),
  };
}

function getChargeUuidCustomAttributeKey(charge: { uuid: string; type: 'hourly' | 'fixed' }) {
  const prefix = {
    hourly: HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    fixed: FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
  }[charge.type];

  return `${prefix}${charge.uuid}`;
}

/**
 * When charges are absorbed, their custom attribute keys are prefixed by the charge uuid key.
 */
function getAbsorbedChargeCustomAttributeKey(charge: { uuid: string; type: 'hourly' | 'fixed' }, key: string) {
  if (getUuidFromCustomAttributeKey(key) !== null) {
    // uuids are not absorbed so we can identify absorbed charges
    return key;
  }

  return `${getChargeUuidCustomAttributeKey(charge)}:${key}`;
}

export function getUuidFromCustomAttributeKey(customAttributeKey: string) {
  const prefixes = {
    item: ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    hourly: HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    fixed: FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
  } as const;

  for (const [type, prefix] of entries(prefixes)) {
    if (!customAttributeKey.startsWith(prefix)) {
      continue;
    }

    const uuid = customAttributeKey.slice(prefix.length);

    if (uuid.includes(':')) {
      // this is an absorbed charge custom attribute
      continue;
    }

    return { type, uuid };
  }

  return null;
}
