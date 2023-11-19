import type { ShopSettings } from '../../schemas/generated/shop-settings.js';

const defaultShopSettings: ShopSettings = {
  statuses: [
    { name: 'Draft', bgHex: '#568ef4', textHex: '#ffffff' },
    { name: 'In Progress', bgHex: '#3ace3a', textHex: '#ffffff' },
    { name: 'Done', bgHex: '#7e98ac', textHex: '#ffffff' },
  ],
  idFormat: 'WO-#{{id}}',
  discountShortcuts: [
    { value: 10, unit: 'percentage' },
    { value: 100, unit: 'currency' },
  ],
  discountRules: {
    onlyAllowShortcuts: true,
    allowedPercentageRange: null,
    allowedCurrencyRange: null,
  },
  depositShortcuts: [
    { value: 40, unit: 'percentage' },
    { value: 100, unit: 'currency' },
  ],
  depositRules: {
    onlyAllowShortcuts: true,
    onlyAllowHighestAbsoluteShortcut: true,
    allowedCurrencyRange: null,
    allowedPercentageRange: null,
  },
};

export function getDefaultShopSetting<const K extends keyof ShopSettings>(key: K): ShopSettings[K] {
  // deep copy
  return JSON.parse(JSON.stringify(defaultShopSettings[key]));
}

export function getShopSettingKeys(): (keyof ShopSettings)[] {
  return Object.keys(defaultShopSettings) as (keyof ShopSettings)[];
}
