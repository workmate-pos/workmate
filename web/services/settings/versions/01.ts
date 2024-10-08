import { z } from 'zod';
import { uuid } from '@work-orders/common/util/uuid.js';
import { zDecimal, zLiquidTemplate, zMoney } from '../../../util/zod.js';
import { quoteTemplate } from '../../mail/templates/defaults/work-order/quote.js';
import { workOrderInvoiceTemplate } from '../../mail/templates/defaults/work-order/invoice.js';
import { purchaseOrderInvoiceTemplate } from '../../mail/templates/defaults/purchase-order/invoice.js';
import { isPermission, permissions } from '../../permissions/permissions.js';

const PercentageRange = z.tuple([zDecimal, zDecimal]);
const CurrencyRange = z.tuple([zMoney, zMoney]);

/**
 * Schema that matches the original json schema used for settings.
 */
export const ShopSettings01 = z.object({
  version: z
    .literal(1)
    .default(1)
    .describe('Version of the shop settings schema. Can be used to lazily migrate settings.'),

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

  purchaseOrderWebhook: z
    .object({
      endpointUrl: z.string().min(1).optional(),
    })
    .default({}),

  // TODO: Verify that this is a valid format
  idFormat: z.string().min(1).default('WO-#{{id}}'),
  statuses: z
    .string()
    .min(1)
    .array()
    .refine(arr => new Set(arr).size === arr.length, 'Statuses must be unique')
    .default(['Draft', 'In Progress', 'Done']),
  defaultStatus: z.string().min(1).default('Draft'),

  purchaseOrderIdFormat: z.string().min(1).default('PO-#{{id}}'),
  purchaseOrderStatuses: z
    .string()
    .min(1)
    .array()
    .refine(arr => new Set(arr).size === arr.length, 'Statuses must be unique')
    .default(['Draft', 'In Transit', 'Received']),
  defaultPurchaseOrderStatus: z.string().min(1).default('Draft'),

  stockTransferIdFormat: z.string().min(1).default('TO-#{{id}}'),

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
        .refine(arr => new Set(arr).size === arr.length, 'Statuses must be unique')
        .default(['Draft', 'Completed']),
      defaultStatus: z.string().min(1).default('Draft'),
    })
    .refine(
      cycleCount => cycleCount.statuses.includes(cycleCount.defaultStatus),
      'Default status must be one of the configured statuses',
    )
    .default({}),

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

  defaultRate: zMoney.default('15.00'),
  labourLineItemName: z.string().min(1).default('Labour'),
  labourLineItemSKU: z.string().default(''),

  chargeSettings: z
    .object({
      employeeAssignments: z.boolean().default(true),
      hourlyLabour: z.boolean().default(true),
      fixedPriceLabour: z.boolean().default(true),
    })
    .default({}),

  emailFromTitle: z.string().default('WorkMate'),
  emailReplyTo: z.string().default(''),
  // TODO: validate
  printEmail: z.string().default(''),

  workOrders: z
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

  purchaseOrders: z
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
    .refine(
      roles => new Set(Object.values(roles).map(role => role.name)).size === Object.keys(roles).length,
      'Roles must have unique names',
    )
    .refine(roles => Object.keys(roles).length > 0, 'Must have at least one role')
    .refine(
      roles => Object.values(roles).filter(role => role.isDefault).length === 1,
      'Must have exactly one default role',
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
    })),
});

// These are not compatible with z.discriminatedUnion so are omitted.
// The refinements are moved to inside of the z.object({}) in the next version, so are not an issue.
// .default({})
// .refine(
//   settings => settings.statuses.includes(settings.defaultStatus),
//   'Default work order status must be one of the configured statuses',
// )
// .refine(
//   settings => settings.purchaseOrderStatuses.includes(settings.defaultPurchaseOrderStatus),
//   'Default purchase order status must be one of the configured statuses',
// );
