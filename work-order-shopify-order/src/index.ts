// TODO: Move to common

import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertMoney, BigDecimal, Money, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { groupByKey } from '@teifi-digital/shopify-app-toolbox/array';
import { hasNestedPropertyValue, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

export type WorkOrderItem = {
  uuid: string;
  quantity: number;
  /**
   * When charges are absorbed, the line item for this item will adjust its quantity such that the price covers
   * all linked charges. The charges will not have their own line item.
   * This is used for mutable services, i.e. services that don't have a fixed price.
   * This assumes that the price of the product is 1.00.
   * The item quantity does not change the line item quantity, but is reported as-is in the custom attribute.
   */
  absorbCharges: boolean;
} & (
  | {
      type: 'product';
      productVariantId: string;
    }
  | {
      type: 'custom-item';
      name: string;
      unitPrice: string;
    }
);

export type WorkOrderProductItem = Omit<WorkOrderItem & { type: 'product' }, 'type'>;
export type WorkOrderCustomItem = Omit<WorkOrderItem & { type: 'custom-item' }, 'type'>;

type BaseCharge = {
  uuid: string;
  name: string;
  workOrderItem: {
    uuid: string;
    type: 'product' | 'custom-item';
  } | null;
};

export type HourlyLabourCharge = BaseCharge & {
  hours: string;
  rate: string;
};

export type FixedPriceLabourCharge = BaseCharge & {
  amount: string;
};

type LabourCharge =
  | (HourlyLabourCharge & { type: 'hourly-labour-charge' })
  | (FixedPriceLabourCharge & { type: 'fixed-price-labour-charge' });

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
  taxable: boolean;
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
 * Includes a bunch of custom attributes to be able to identify line items.
 */
export function getWorkOrderLineItems(
  productItems: WorkOrderProductItem[],
  customItems: WorkOrderCustomItem[],
  hourlyLabourCharges: HourlyLabourCharge[],
  fixedPriceLabourCharges: FixedPriceLabourCharge[],
  options: {
    labourSku: string;
  },
): { lineItems: LineItem[]; customSales: CustomSale[] } {
  const charges = getUniquelyNamedCharges(getChargesWithTypes(hourlyLabourCharges, fixedPriceLabourCharges));

  // create line items
  const lineItemByVariantId: Record<ID, LineItem> = {};

  for (const item of productItems) {
    const { productVariantId, quantity, absorbCharges } = item;

    assertGid(productVariantId);

    const lineItem = (lineItemByVariantId[productVariantId] ??= {
      productVariantId,
      quantity: 0,
      customAttributes: {},
    });

    lineItem.customAttributes = {
      ...lineItem.customAttributes,
      ...getItemCustomAttributes({ ...item, type: 'product' }, charges, options),
    };

    if (absorbCharges) {
      const absorbedCharges = charges
        .filter(hasNestedPropertyValue('workOrderItem.type', 'product'))
        .filter(hasNestedPropertyValue('workOrderItem.uuid', item.uuid));

      const totalChargeCost = BigDecimal.sum(
        ...absorbedCharges.map(getChargeUnitPrice).map(money => BigDecimal.fromMoney(money)),
      );

      lineItem.quantity += Number(totalChargeCost.round(0, RoundingMode.CEILING).toString());
    } else {
      lineItem.quantity += quantity;
    }
  }

  const customSales: CustomSale[] = [];

  for (const item of customItems) {
    const { quantity, name, absorbCharges } = item;

    assertMoney(item.unitPrice);
    let { unitPrice } = item;

    if (absorbCharges) {
      const absorbedCharges = charges
        .filter(hasNestedPropertyValue('workOrderItem.type', 'custom-item'))
        .filter(hasNestedPropertyValue('workOrderItem.uuid', item.uuid));

      const totalChargeCost = BigDecimal.sum(
        ...absorbedCharges.map(getChargeUnitPrice).map(money => BigDecimal.fromMoney(money)),
      );

      const quantityBigDecimal = BigDecimal.fromString(quantity.toFixed(0));

      const baseCost = BigDecimal.fromMoney(unitPrice).multiply(quantityBigDecimal);

      const totalCost = baseCost.add(totalChargeCost);

      unitPrice = totalCost.divide(quantityBigDecimal).round(2, RoundingMode.CEILING).toMoney();
    }

    customSales.push({
      title: name,
      quantity,
      taxable: true,
      unitPrice,
      customAttributes: getItemCustomAttributes({ ...item, type: 'custom-item' }, charges, options),
    });
  }

  for (const charge of charges) {
    let isAbsorbed = false;

    if (charge.workOrderItem) {
      if (charge.workOrderItem?.type === 'product') {
        isAbsorbed = productItems
          .filter(hasPropertyValue('uuid', charge.workOrderItem?.uuid ?? ''))
          .some(hasPropertyValue('absorbCharges', true));
      } else if (charge.workOrderItem?.type === 'custom-item') {
        isAbsorbed = customItems
          .filter(hasPropertyValue('uuid', charge.workOrderItem?.uuid ?? ''))
          .some(hasPropertyValue('absorbCharges', true));
      } else {
        return charge.workOrderItem.type satisfies never;
      }
    }

    if (isAbsorbed) {
      continue;
    }

    const quantity = 1;

    customSales.push({
      customAttributes: getChargeCustomAttributes(charge, options, quantity),
      unitPrice: getChargeUnitPrice(charge),
      title: charge.name,
      quantity,
      taxable: true,
    });
  }

  return {
    lineItems: Object.values(lineItemByVariantId).map(lineItem => ({
      ...lineItem,
      quantity: Math.max(1, lineItem.quantity),
    })),
    customSales,
  };
}

function getChargesWithTypes(
  hourlyLabourCharges: HourlyLabourCharge[],
  fixedPriceLabourCharges: FixedPriceLabourCharge[],
): LabourCharge[] {
  return [
    ...hourlyLabourCharges.map(charge => ({ ...charge, type: 'hourly-labour-charge' }) as const),
    ...fixedPriceLabourCharges.map(charge => ({ ...charge, type: 'fixed-price-labour-charge' }) as const),
  ];
}

function getUniquelyNamedCharges(charges: LabourCharge[]) {
  // ensure charge names are unique by adding "(count)" to every duplicate name
  const chargesByName = groupByKey(charges, 'name');

  return Object.values(chargesByName).flatMap(charges => {
    if (charges.length === 1) return charges;
    return charges.map((charge, i) => ({
      ...charge,
      name: `${charge.name} (${i + 1})`,
    }));
  });
}

export function getChargeUnitPrice(
  charge: Pick<HourlyLabourCharge, 'hours' | 'rate'> | Pick<FixedPriceLabourCharge, 'amount'>,
): Money {
  if ('amount' in charge) {
    return BigDecimal.fromString(charge.amount).round(2, RoundingMode.CEILING).toMoney();
  }

  return BigDecimal.fromString(charge.hours)
    .multiply(BigDecimal.fromString(charge.rate))
    .round(2, RoundingMode.CEILING)
    .toMoney();
}

const ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX = '_wm_item_uuid:';
const CUSTOM_ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX = '_wm_custom_item_uuid:';
const HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX = '_wm_hourly_charge_uuid:';
const FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX = '_wm_fixed_charge_uuid:';
export const WORK_ORDER_CUSTOM_ATTRIBUTE_NAME = 'Work Order';

export function getWorkOrderOrderCustomAttributes(workOrder: { name: string; customFields: Record<string, string> }) {
  return {
    ...workOrder.customFields,
    [WORK_ORDER_CUSTOM_ATTRIBUTE_NAME]: workOrder.name,
  };
}

function getItemCustomAttributes(item: WorkOrderItem, charges: LabourCharge[], options: { labourSku: string }) {
  const customAttributes: Record<string, string> = {};

  if (item.type === 'product') {
    customAttributes[getItemUuidCustomAttributeKey({ uuid: item.uuid })] = String(item.quantity);
  } else if (item.type === 'custom-item') {
    customAttributes[getCustomItemUuidCustomAttributeKey({ uuid: item.uuid })] = String(item.quantity);
  } else {
    return item satisfies never;
  }

  const linkedCharges = charges
    .filter(hasNestedPropertyValue('workOrderItem.type', item.type))
    .filter(hasNestedPropertyValue('workOrderItem.uuid', item.uuid));

  if (item.absorbCharges) {
    for (const absorbedCharge of linkedCharges) {
      const quantity = 1;
      const chargeCustomAttributes = getChargeCustomAttributes(absorbedCharge, options, quantity);
      for (const [key, value] of Object.entries(chargeCustomAttributes)) {
        customAttributes[getAbsorbedChargeCustomAttributeKey(absorbedCharge, key)] = value;
      }
    }
  }

  for (const charge of linkedCharges) {
    customAttributes[charge.name] = getChargeUnitPrice(charge);
  }

  return customAttributes;
}

function getChargeCustomAttributes(
  charge:
    | ({ type: 'hourly-labour-charge' } & HourlyLabourCharge)
    | ({ type: 'fixed-price-labour-charge' } & FixedPriceLabourCharge),
  options: { labourSku: string },
  quantity: number,
): Record<string, string> {
  const customAttributes: Record<string, string> = {
    [getChargeUuidCustomAttributeKey(charge)]: String(quantity),
    _wm_sku: options.labourSku,
  };

  if (charge.workOrderItem) {
    if (charge.workOrderItem.type === 'product') {
      customAttributes._wm_linked_to_item_uuid = String(quantity);
    } else if (charge.workOrderItem.type === 'custom-item') {
      customAttributes._wm_linked_to_custom_item_uuid = String(quantity);
    } else {
      return charge.workOrderItem.type satisfies never;
    }
  }

  return customAttributes;
}

export function getItemUuidCustomAttributeKey(item: { uuid: string }) {
  return `${ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX}${item.uuid}`;
}

export function getCustomItemUuidCustomAttributeKey(item: { uuid: string }) {
  return `${CUSTOM_ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX}${item.uuid}`;
}

export function getChargeUuidCustomAttributeKey(charge: Pick<LabourCharge, 'uuid' | 'type'>) {
  const prefix = {
    'hourly-labour-charge': HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    'fixed-price-labour-charge': FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
  }[charge.type];

  return `${prefix}${charge.uuid}`;
}

const ABSORBED_CHARGE_SEPARATOR = ':';

/**
 * When charges are absorbed, their custom attribute keys are prefixed by the charge uuid key.
 */
function getAbsorbedChargeCustomAttributeKey(charge: LabourCharge, key: string) {
  if (getUuidFromCustomAttributeKey(key) !== null) {
    // uuids are not absorbed so we can identify absorbed charges
    return key;
  }

  return `${getChargeUuidCustomAttributeKey(charge)}${ABSORBED_CHARGE_SEPARATOR}${key}`;
}

export function getUuidFromCustomAttributeKey(customAttributeKey: string) {
  const prefixes = {
    item: ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    'custom-item': CUSTOM_ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
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

export function getAbsorbedUuidFromCustomAttributeKey(customAttributeKey: string) {
  const prefixes = [
    ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    CUSTOM_ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
  ];

  for (const prefix of prefixes) {
    if (
      customAttributeKey.startsWith(prefix) &&
      customAttributeKey.includes(ABSORBED_CHARGE_SEPARATOR, prefix.length)
    ) {
      const [base = never(), absorbed = never()] = customAttributeKey.split(ABSORBED_CHARGE_SEPARATOR);

      const baseUuid = getUuidFromCustomAttributeKey(base);
      const absorbedUuid = getUuidFromCustomAttributeKey(absorbed);

      if (!baseUuid || !absorbedUuid) {
        return null;
      }

      return {
        baseUuid,
        absorbedUuid,
      };
    }
  }

  return null;
}

/**
 * Utility to extract all uuids from a Shopify Line Item
 */
export function getUuidsFromCustomAttributes(customAttributes: { key: string }[]) {
  return customAttributes.map(({ key }) => getUuidFromCustomAttributeKey(key)).filter(isNonNullable);
}

export function getAbsorbedUuidsFromCustomAttributes(customAttributes: { key: string }[]) {
  return customAttributes.map(({ key }) => getAbsorbedUuidFromCustomAttributeKey(key)).filter(isNonNullable);
}

export function getCustomAttributeArrayFromObject(obj: Record<string, string>): { key: string; value: string }[] {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}
