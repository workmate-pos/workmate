import { Money, Decimal, BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import type { ShopSettings } from '../../schemas/generated/shop-settings.js';
import { quoteTemplate } from '../mail/templates/defaults/work-order/quote.js';
import { workOrderInstallationOverviewTemplate } from '../mail/templates/defaults/work-order/work-order.js';
import { purchaseOrderInvoiceTemplate } from '../mail/templates/defaults/purchase-order/invoice.js';
import { workOrderInvoiceTemplate } from '../mail/templates/defaults/work-order/invoice.js';
import { pickTicketTemplate } from '../mail/templates/defaults/work-order/pick-ticket.js';

const defaultShopSettings: ShopSettings = {
  statuses: ['Draft', 'In Progress', 'Done'],
  defaultStatus: 'Draft',
  idFormat: 'WO-#{{id}}',
  discountShortcuts: [
    { percentage: '10.00' as Decimal, unit: 'percentage' },
    { money: '10.00' as Money, unit: 'currency' },
  ],
  discountRules: {
    onlyAllowShortcuts: true,
    allowedPercentageRange: null,
    allowedCurrencyRange: null,
  },
  depositShortcuts: [
    { percentage: BigDecimal.fromString('40.00').toDecimal(), unit: 'percentage' },
    { money: BigDecimal.fromString('100.00').toMoney(), unit: 'currency' },
  ],
  depositRules: {
    onlyAllowShortcuts: true,
    onlyAllowHighestAbsoluteShortcut: true,
    allowedCurrencyRange: null,
    allowedPercentageRange: null,
  },
  workOrderRequests: {
    enabled: false,
    status: null,
  },
  mutableServiceCollectionId: null,
  fixedServiceCollectionId: null,
  defaultRate: '15.00' as Money,
  labourLineItemName: 'Labour',
  labourLineItemSKU: '',
  chargeSettings: {
    fixedPriceLabour: true,
    hourlyLabour: true,
    employeeAssignments: true,
  },
  purchaseOrderIdFormat: 'PO-#{{id}}',
  purchaseOrderStatuses: ['Draft', 'In Transit', 'Received'],
  defaultPurchaseOrderStatus: 'Draft',
  emailFromTitle: 'WorkMate',
  emailReplyTo: '',
  printEmail: '',
  workOrderPrintTemplates: {
    Quote: {
      subject: 'Quote for {{ name }}',
      template: quoteTemplate,
    },
    'Work Order Installation Overview': {
      subject: 'Work Order {{ name }}',
      template: workOrderInstallationOverviewTemplate,
    },
    'WO Invoice': {
      subject: 'Invoice for {{ name }}',
      template: workOrderInvoiceTemplate,
    },
    'Install Pick Ticket': {
      subject: 'Install Pick Ticket for {{ name }}',
      template: pickTicketTemplate,
    },
  },
  purchaseOrderPrintTemplates: {
    'PO Invoice': {
      subject: 'Invoice for {{ name }}',
      template: purchaseOrderInvoiceTemplate,
    },
  },
  purchaseOrderWebhook: {
    endpointUrl: null,
  },
};

export function getDefaultShopSetting<const K extends keyof ShopSettings>(key: K): ShopSettings[K] {
  // deep copy
  return JSON.parse(JSON.stringify(defaultShopSettings[key]));
}

export function getShopSettingKeys(): (keyof ShopSettings)[] {
  return Object.keys(defaultShopSettings) as (keyof ShopSettings)[];
}
