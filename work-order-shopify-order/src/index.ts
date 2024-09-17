// TODO: Move web / ... / draft-order.ts since thats now the source of truth for all orders

import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertMoney, BigDecimal, Money, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { groupByKey } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

type WorkOrderItemBase = {
  uuid: string;
  quantity: number;
  /**
   * When charges are absorbed, the line item for this item will adjust its quantity such that the price covers
   * all linked charges. The charges will not have their own line item.
   * This is used for mutable services, i.e. services that don't have a fixed price.
   * This uses the unit price of the product variant to calculate what the quantity should be.
   * The item quantity (above) does not change the line item quantity, but is reported as-is in the custom attribute.
   */
  absorbCharges: boolean;
};

export type WorkOrderProductItem = WorkOrderItemBase & {
  type: 'product';
  productVariantId: string;
  /**
   * Product variant unit price. Only required if absorbCharges is true.
   */
  unitPrice?: string;
};

export type WorkOrderCustomItem = WorkOrderItemBase & {
  type: 'custom-item';
  name: string;
  unitPrice: string;
};

export type WorkOrderItem = WorkOrderProductItem | WorkOrderCustomItem;

type BaseCharge = {
  uuid: string;
  name: string;
  workOrderItemUuid: string | null;
};

export type HourlyLabourCharge = BaseCharge & {
  type: 'hourly-labour';
  hours: string;
  rate: string;
};

export type FixedPriceLabourCharge = BaseCharge & {
  type: 'fixed-price-labour';
  amount: string;
};

export type WorkOrderLabourCharge = HourlyLabourCharge | FixedPriceLabourCharge;

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
  productItems: Omit<WorkOrderProductItem, 'type'>[],
  customItems: Omit<WorkOrderCustomItem, 'type'>[],
  hourlyLabourCharges: HourlyLabourCharge[],
  fixedPriceLabourCharges: FixedPriceLabourCharge[],
  options: {
    labourSku: string;
    workOrderName: string;
  },
): { lineItems: LineItem[]; customSales: CustomSale[] } {
  const charges = getUniquelyNamedCharges(getChargesWithTypes(hourlyLabourCharges, fixedPriceLabourCharges));

  // create line items
  const lineItemByVariantId: Record<ID, LineItem> = {};

  for (const item of productItems) {
    const { productVariantId, quantity, absorbCharges, unitPrice } = item;

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
      if (!unitPrice) {
        throw new Error('Must provide unit price when absorbing charges');
      }

      const absorbedCharges = charges.filter(hasPropertyValue('workOrderItemUuid', item.uuid));

      const totalChargeCost = BigDecimal.sum(
        ...absorbedCharges.map(getChargeUnitPrice).map(money => BigDecimal.fromMoney(money)),
      );

      const quantityBigDecimal = BigDecimal.fromString(quantity.toFixed(0));

      lineItem.quantity += Number(totalChargeCost.divide(quantityBigDecimal).round(0, RoundingMode.CEILING).toString());
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
      const absorbedCharges = charges.filter(hasPropertyValue('workOrderItemUuid', item.uuid));

      const totalChargeCost = BigDecimal.sum(
        ...absorbedCharges.map(getChargeUnitPrice).map(money => BigDecimal.fromMoney(money)),
      );

      const quantityBigDecimal = BigDecimal.fromString(quantity.toFixed(0));

      const baseCost = BigDecimal.fromMoney(unitPrice).multiply(quantityBigDecimal);

      const totalCost = baseCost.add(totalChargeCost);

      unitPrice = totalCost.divide(quantityBigDecimal).round(2, RoundingMode.CEILING).toMoney();
    }

    const customAttributes = getItemCustomAttributes({ ...item, type: 'custom-item' }, charges, options);

    customSales.push({
      title: name,
      quantity,
      taxable: true,
      unitPrice,
      customAttributes,
    });
  }

  for (const charge of charges) {
    const isAbsorbed =
      charge.workOrderItemUuid !== null &&
      ([...productItems, ...customItems].find(hasPropertyValue('uuid', charge.workOrderItemUuid))?.absorbCharges ??
        false);

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

  const lineItems = Object.values(lineItemByVariantId).map(lineItem => ({
    ...lineItem,
    quantity: Math.max(1, lineItem.quantity),
  }));

  // receipts don't support order level custom attributes (yet, hopefully) so we store it in the first line item for now
  if (lineItems.length) {
    // pos does this in reverse order 🙂
    const firstLineItem = lineItems.at(-1);

    if (firstLineItem) {
      firstLineItem.customAttributes = {
        ...firstLineItem.customAttributes,
        [FIRST_LINE_ITEM_WORK_ORDER_CUSTOM_ATTRIBUTE_NAME]: options.workOrderName,
      };
    }
  } else if (customSales.length) {
    const firstCustomSale = customSales.at(-1);

    if (firstCustomSale) {
      firstCustomSale.customAttributes = {
        ...firstCustomSale.customAttributes,
        [FIRST_LINE_ITEM_WORK_ORDER_CUSTOM_ATTRIBUTE_NAME]: options.workOrderName,
      };
    }
  }

  return {
    lineItems,
    customSales,
  };
}

function getChargesWithTypes(
  hourlyLabourCharges: HourlyLabourCharge[],
  fixedPriceLabourCharges: FixedPriceLabourCharge[],
): WorkOrderLabourCharge[] {
  return [
    ...hourlyLabourCharges.map(charge => ({ ...charge, type: 'hourly-labour' }) as const),
    ...fixedPriceLabourCharges.map(charge => ({ ...charge, type: 'fixed-price-labour' }) as const),
  ];
}

function getUniquelyNamedCharges(charges: WorkOrderLabourCharge[]) {
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
const CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX = '_wm_charge_uuid:';

const _DEPRECATED_CUSTOM_ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX = '_wm_custom_item_uuid:';
const _DEPRECATED_HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX = '_wm_hourly_charge_uuid:';
const _DEPRECATED_FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX = '_wm_fixed_charge_uuid:';

export const WORK_ORDER_CUSTOM_ATTRIBUTE_NAME = 'Work Order';
const FIRST_LINE_ITEM_WORK_ORDER_CUSTOM_ATTRIBUTE_NAME = '_wm_id';

export function getWorkOrderOrderCustomAttributes(workOrder: { name: string; customFields: Record<string, string> }) {
  return {
    ...workOrder.customFields,
    [WORK_ORDER_CUSTOM_ATTRIBUTE_NAME]: workOrder.name,
  };
}

function getItemCustomAttributes(
  item: WorkOrderItem,
  charges: WorkOrderLabourCharge[],
  options: { labourSku: string },
) {
  const customAttributes: Record<string, string> = {};

  customAttributes[getItemUuidCustomAttributeKey({ uuid: item.uuid })] = String(item.quantity);

  const linkedCharges = charges.filter(hasPropertyValue('workOrderItemUuid', item.uuid));

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
  charge: ({ type: 'hourly-labour' } & HourlyLabourCharge) | ({ type: 'fixed-price-labour' } & FixedPriceLabourCharge),
  options: { labourSku: string },
  quantity: number,
): Record<string, string> {
  const customAttributes: Record<string, string> = {
    [getChargeUuidCustomAttributeKey(charge)]: String(quantity),
  };

  if (options.labourSku) {
    customAttributes._wm_sku = options.labourSku;
  }

  if (charge.workOrderItemUuid) {
    customAttributes._wm_linked_to_item_uuid = charge.workOrderItemUuid;
  }

  return customAttributes;
}

export function getItemUuidCustomAttributeKey(item: { uuid: string }) {
  return `${ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX}${item.uuid}`;
}

export function getChargeUuidCustomAttributeKey(charge: { uuid: string }) {
  return `${CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX}${charge.uuid}`;
}

const ABSORBED_CHARGE_SEPARATOR = ':';

/**
 * When charges are absorbed, their custom attribute keys are prefixed by the charge uuid key.
 */
function getAbsorbedChargeCustomAttributeKey(charge: WorkOrderLabourCharge, key: string) {
  if (getUuidFromCustomAttributeKey(key) !== null) {
    // uuids are not absorbed so we can identify absorbed charges
    return key;
  }

  return `${getChargeUuidCustomAttributeKey(charge)}${ABSORBED_CHARGE_SEPARATOR}${key}`;
}

export function getUuidFromCustomAttributeKey(customAttributeKey: string) {
  const prefixes = {
    item: ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    charge: CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,

    // Backwards compatibility
    'custom-item': _DEPRECATED_CUSTOM_ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    hourly: _DEPRECATED_HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    fixed: _DEPRECATED_FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
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

    // Accept the old custom attributes but convert them to the new type system
    const newType = (
      {
        item: 'item',
        charge: 'charge',

        'custom-item': 'item',
        hourly: 'charge',
        fixed: 'charge',
      } as const
    )[type];

    return { type: newType, uuid };
  }

  return null;
}

export function getAbsorbedUuidFromCustomAttributeKey(customAttributeKey: string) {
  const prefixes = [
    ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,

    // Backwards compatibility
    _DEPRECATED_CUSTOM_ITEM_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    _DEPRECATED_HOURLY_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
    _DEPRECATED_FIXED_CHARGE_UUID_LINE_ITEM_CUSTOM_ATTRIBUTE_PREFIX,
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

export function getCustomAttributeObjectFromArray(customAttributes: { key: string; value: string | null }[]) {
  return customAttributes.reduce((acc, { key, value }) => ({ ...acc, [key]: value || '' }), {});
}
