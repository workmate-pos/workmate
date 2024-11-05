import { z } from 'zod';
import { ShopSettings01 } from './versions/01.js';
import { lastElement } from '@teifi-digital/shopify-app-toolbox/array';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { ShopSettings02 } from './versions/02.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

export const versions = [ShopSettings01, ShopSettings02] as const;

export const ShopSettings = lastElement(versions);
export type ShopSettings = z.infer<typeof ShopSettings>;

const AnyShopSettingsVersion = z.discriminatedUnion('version', [ShopSettings01, ShopSettings02]);
type AnyShopSettingsVersion = z.infer<typeof AnyShopSettingsVersion>;

const newShopSettings = ShopSettings.parse({});

export function parseShopSettings(shopSettings: unknown) {
  if (!shopSettings) {
    return newShopSettings;
  }

  const parsed = AnyShopSettingsVersion.safeParse(shopSettings);

  if (!parsed.success) {
    sentryErr(new Error('Error parsing shop settings', { cause: parsed.error }), { shopSettings });
    throw new HttpError('Could not parse settings', 500);
  }

  const migratedShopSettings = migrateShopSettings(parsed.data);
  const parsedElectricBoogaloo = ShopSettings.safeParse(migratedShopSettings);

  if (!parsedElectricBoogaloo.success) {
    sentryErr(new Error('Error parsing shop settings after migration', { cause: parsedElectricBoogaloo.error }), {
      shopSettings,
      migratedShopSettings,
    });
    throw new HttpError('Could not parse settings', 500);
  }

  return parsedElectricBoogaloo.data;
}

/**
 * Migrate function that can upgrade versions of the settings schema.
 * Makes it easy to lazily upgrade without requiring an app migration.
 * Can support async if needed in the future.
 */
function migrateShopSettings(shopSettings: AnyShopSettingsVersion): ShopSettings {
  if (shopSettings.version === 1) {
    return migrateShopSettings({
      ...shopSettings,
      version: 2,

      purchaseOrders: {
        webhook: z.string().url().safeParse(shopSettings.purchaseOrderWebhook.endpointUrl).success
          ? { enabled: true, endpointUrl: shopSettings.purchaseOrderWebhook.endpointUrl ?? never() }
          : { enabled: false },

        idFormat: shopSettings.purchaseOrderIdFormat,
        statuses: shopSettings.purchaseOrderStatuses,
        defaultStatus: shopSettings.defaultPurchaseOrderStatus,
        printTemplates: shopSettings.purchaseOrders,
        vendorCustomerMetafieldsToShow: shopSettings.vendorCustomerMetafieldsToShow,
        receipts: { idFormat: 'PO-RCPT-#{{id}}' },
      },

      workOrders: {
        idFormat: shopSettings.idFormat,
        statuses: shopSettings.statuses,
        defaultStatus: shopSettings.defaultStatus,
        printTemplates: shopSettings.workOrders,
        discountShortcuts: shopSettings.discountShortcuts,
        discountRules: shopSettings.discountRules,
        charges: {
          allowEmployeeAssignments: shopSettings.chargeSettings.employeeAssignments,
          allowHourlyLabour: shopSettings.chargeSettings.hourlyLabour,
          allowFixedPriceLabour: shopSettings.chargeSettings.fixedPriceLabour,
          defaultHourlyRate: shopSettings.defaultRate,
          defaultLabourLineItemName: shopSettings.labourLineItemName,
          defaultLabourLineItemSKU: shopSettings.labourLineItemSKU,
        },
      },

      transferOrders: {
        idFormat: shopSettings.stockTransferIdFormat,
      },

      printing: {
        global: {
          defaultFrom: shopSettings.emailFromTitle,
          defaultReplyTo: shopSettings.emailReplyTo,
          defaultEmail: z.string().email().safeParse(shopSettings.printEmail).success
            ? shopSettings.printEmail
            : undefined,

          allowCustomReplyTo: true,
          allowCustomEmail: true,
          allowCustomFrom: true,
        },
        locationOverrides: {},
      },
    });
  }

  return shopSettings;
}
