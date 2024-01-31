import { Money, Decimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import type { ShopSettings } from '../../schemas/generated/shop-settings.js';

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
};

export function getDefaultShopSetting<const K extends keyof ShopSettings>(key: K): ShopSettings[K] {
  // deep copy
  return JSON.parse(JSON.stringify(defaultShopSettings[key]));
}

export function getShopSettingKeys(): (keyof ShopSettings)[] {
  return Object.keys(defaultShopSettings) as (keyof ShopSettings)[];
}
