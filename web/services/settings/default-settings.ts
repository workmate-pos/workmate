import { Money, Decimal, BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import type { ShopSettings } from '../../schemas/generated/shop-settings.js';
import { quoteTemplate } from '../mail/templates/defaults/work-order/quote.js';
import { purchaseOrderInvoiceTemplate } from '../mail/templates/defaults/purchase-order/invoice.js';
import { workOrderInvoiceTemplate } from '../mail/templates/defaults/work-order/invoice.js';

const defaultShopSettings: ShopSettings = {
  workOrderTypes: {
    WORK_ORDER: { idFormat: 'WO-#{{id}}' },
    BACK_ORDER: { idFormat: 'BO-#{{id}}' },
    SALE: { idFormat: 'S-#{{id}}' },
    LAYAWAY: { idFormat: 'LA-#{{id}}' },
    WARRANTY: { idFormat: 'W-#{{id}}' },
  },
  statuses: ['Draft', 'In Progress', 'Done'],
  defaultStatus: 'Draft',
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
  stockTransferIdFormat: 'TO-#{{id}}',
  emailFromTitle: 'WorkMate',
  emailReplyTo: '',
  printEmail: '',
  workOrderPrintTemplates: {
    Quote: {
      subject: 'Quote for {{ name }}',
      template: quoteTemplate,
    },
    'WO Invoice': {
      subject: 'Invoice for {{ name }}',
      template: workOrderInvoiceTemplate,
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
  vendorCustomerMetafieldsToShow: [],
};

export function getDefaultShopSetting<const K extends keyof ShopSettings>(key: K): ShopSettings[K] {
  // deep copy
  return JSON.parse(JSON.stringify(defaultShopSettings[key]));
}

export function getShopSettingKeys(): (keyof ShopSettings)[] {
  return Object.keys(defaultShopSettings) as (keyof ShopSettings)[];
}
