import { Money, Decimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import type { ShopSettings } from '../../schemas/generated/shop-settings.js';
import { quoteTemplate } from '../mail/templates/defaults/work-order/quote.js';
import { workOrderTemplate } from '../mail/templates/defaults/work-order/work-order.js';
import { invoiceTemplate } from '../mail/templates/defaults/purchase-order/invoice.js';

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
    'Work Order Overview': {
      subject: 'Work Order {{ name }}',
      template: workOrderTemplate,
    },
  },
  purchaseOrderPrintTemplates: {
    Invoice: {
      subject: 'Invoice for {{ name }}',
      template: invoiceTemplate,
    },
  },
};

export function getDefaultShopSetting<const K extends keyof ShopSettings>(key: K): ShopSettings[K] {
  // deep copy
  return JSON.parse(JSON.stringify(defaultShopSettings[key]));
}

export function getShopSettingKeys(): (keyof ShopSettings)[] {
  return Object.keys(defaultShopSettings) as (keyof ShopSettings)[];
}
