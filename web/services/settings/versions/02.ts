import { z } from 'zod';
import { uuid } from '@work-orders/common/util/uuid.js';
import { zDecimal, zID, zLiquidTemplate, zMoney, zNamespacedID } from '../../../util/zod.js';
import { quoteTemplate } from '../../mail/templates/defaults/work-order/quote.js';
import { workOrderInvoiceTemplate } from '../../mail/templates/defaults/work-order/invoice.js';
import { purchaseOrderInvoiceTemplate } from '../../mail/templates/defaults/purchase-order/invoice.js';
import { isPermission, permissions } from '../../permissions/permissions.js';

const PercentageRange = z.tuple([zDecimal, zDecimal]);
const CurrencyRange = z.tuple([zMoney, zMoney]);
const PrintSettings = z
  .object({
    defaultFrom: z.string().default('WorkMate'),
    defaultReplyTo: z.string().default(''),
    defaultEmail: z.string().email().optional(),

    allowCustomReplyTo: z.boolean().default(true),
    allowCustomEmail: z.boolean().default(true),
    allowCustomFrom: z.boolean().default(true),
  })
  .default({});

/**
 * Updated schema that gets rid of bad patterns that were a result of the inflexibility of the json schema (i.e. no support for nested defaults).
 */
export const ShopSettings02 = z.object({
  version: z
    .literal(2)
    .default(2)
    .describe('Version of the shop settings schema. Can be used to lazily migrate settings.'),

  purchaseOrders: z
    .object({
      webhook: z
        .discriminatedUnion('enabled', [
          z.object({ enabled: z.literal(false) }),
          z.object({
            enabled: z.literal(true),
            endpointUrl: z.string().url(),
          }),
        ])
        .default({ enabled: false }),

      idFormat: z.string().min(1).default('PO-#{{id}}'),

      statuses: z
        .string()
        .min(1)
        .array()
        .default(['Draft', 'In Transit', 'Received'])
        .refine(arr => new Set(arr).size === arr.length, 'Statuses must be unique'),
      defaultStatus: z.string().min(1).default('Draft'),

      printTemplates: z
        .record(
          z.object({
            template: zLiquidTemplate,
            subject: zLiquidTemplate,
          }),
        )
        .default({
          'PO Invoice': {
            subject: 'Invoice for {{ name }}',
            template: purchaseOrderInvoiceTemplate,
          },
        }),

      vendorCustomerMetafieldsToShow: z.string().array().default([]),
    })
    .default({})
    .refine(
      purchaseOrders => purchaseOrders.statuses.includes(purchaseOrders.defaultStatus),
      'Default purchase order status must be one of the configured statuses',
    ),

  scanner: z
    .object({
      variants: z
        .object({
          barcode: z.boolean(),
          sku: z.boolean(),
          tags: z.boolean(),
          metafields: z
            .object({
              product: z.string().array(),
              variant: z.string().array(),
            })
            .default({ product: [], variant: [] }),
        })
        .default({ barcode: true, sku: true, tags: true }),
    })
    .default({}),

  workOrders: z
    .object({
      // TODO: Verify that this is a valid format (ie valid liquid with corect variables)
      idFormat: z.string().min(1).default('WO-#{{id}}'),

      statuses: z
        .string()
        .min(1)
        .array()
        .default(['Draft', 'In Progress', 'Done'])
        .refine(arr => new Set(arr).size === arr.length, 'Statuses must be unique'),
      defaultStatus: z.string().min(1).default('Draft'),

      discountShortcuts: z
        .discriminatedUnion('unit', [
          z.object({ unit: z.literal('currency'), money: zMoney }),
          z.object({ unit: z.literal('percentage'), percentage: z.preprocess(String, zDecimal) }),
        ])
        .array()
        .default([
          { unit: 'percentage', percentage: '10.00' },
          { unit: 'currency', money: '10.00' },
        ]),

      discountRules: z
        .discriminatedUnion('onlyAllowShortcuts', [
          z.object({ onlyAllowShortcuts: z.literal(true) }),
          z.object({
            onlyAllowShortcuts: z.literal(false),
            allowedPercentageRange: PercentageRange.optional(),
            allowedCurrencyRange: CurrencyRange.optional(),
          }),
        ])
        .default({ onlyAllowShortcuts: true }),

      charges: z
        .object({
          allowEmployeeAssignments: z.boolean().default(true),
          allowHourlyLabour: z.boolean().default(true),
          allowFixedPriceLabour: z.boolean().default(true),

          defaultHourlyRate: zMoney.default('15.00'),
          defaultLabourLineItemName: z.string().min(1).default('Labour'),
          defaultLabourLineItemSKU: z.string().default(''),
        })
        .default({})
        .describe('Charge options that are shown in the UI.'),

      printTemplates: z
        .record(
          z.object({
            template: zLiquidTemplate,
            subject: zLiquidTemplate,
          }),
        )
        .default({
          Quote: {
            subject: 'Quote for {{ name }}',
            template: quoteTemplate,
          },
          'WO Invoice': {
            subject: 'Invoice for {{ name }}',
            template: workOrderInvoiceTemplate,
          },
        }),
    })
    .default({})
    .refine(
      workOrders => workOrders.statuses.includes(workOrders.defaultStatus),
      'Default work order status must be one of the configured statuses',
    ),

  transferOrders: z
    .object({
      idFormat: z.string().min(1).default('TO-#{{id}}'),
    })
    .default({}),

  specialOrders: z
    .object({
      idFormat: z.string().min(1).default('SPO-#{{id}}'),
    })
    .default({}),

  cycleCount: z
    .object({
      idFormat: z.string().min(1).default('CC-#{{id}}'),
      statuses: z
        .string()
        .min(1)
        .array()
        .default(['Draft', 'Completed'])
        .refine(arr => new Set(arr).size === arr.length, 'Statuses must be unique'),
      defaultStatus: z.string().min(1).default('Draft'),
    })
    .default({})
    .refine(
      cycleCount => cycleCount.statuses.includes(cycleCount.defaultStatus),
      'Default status must be one of the configured statuses',
    ),

  printing: z
    .object({
      global: PrintSettings,
      locationOverrides: z.record(PrintSettings).default({}), // Record<ID, PrintSettings>, ID as key makes this partial for some reason
    })
    .default({}),

  franchises: z
    .object({
      enabled: z
        .boolean()
        .default(false)
        .describe('Enabling franchise mode allows you to restrict locations on a per-employee basis.'),
    })
    .default({}),

  roles: z
    .record(
      z.object({
        name: z.string().min(1),
        isDefault: z.boolean(),
        permissions: z.string().refine(isPermission, 'Invalid permission').array(),
      }),
    )
    .default(() => ({
      [uuid()]: {
        name: 'Associate',
        isDefault: true,
        permissions: [
          'read_employees',
          'read_settings',
          'read_work_orders',
          'write_work_orders',
          'read_purchase_orders',
          'read_stock_transfers',
          'read_special_orders',
          'write_special_orders',
          'cycle_count',
        ],
      },
      [uuid()]: {
        name: 'Manager',
        isDefault: false,
        permissions: permissions.filter(
          permission =>
            permission !== 'read_app_plan' &&
            permission !== 'write_app_plan' &&
            permission !== 'write_settings' &&
            permission !== 'write_employees',
        ),
      },
      [uuid()]: {
        name: 'Administrator',
        isDefault: false,
        permissions: [...permissions],
      },
    }))
    .refine(
      roles => new Set(Object.values(roles).map(role => role.name)).size === Object.keys(roles).length,
      'Roles must have unique names',
    )
    .refine(roles => Object.keys(roles).length > 0, 'Must have at least one role')
    .refine(
      roles => Object.values(roles).filter(role => role.isDefault).length === 1,
      'Must have exactly one default role',
    ),
});
