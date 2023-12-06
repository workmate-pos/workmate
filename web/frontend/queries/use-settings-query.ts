import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';
import { useQuery, UseQueryOptions } from 'react-query';
import type { FetchSettingsResponse } from '../../controllers/api/settings';
import type { CurrencyRange, Unit } from '../../schemas/generated/shop-settings';
import { toDollars } from '../util/money';

// TODO: Shared `queries` project to be shared between frontend and pos
export const useSettingsQuery = (
  options?: UseQueryOptions<FetchSettingsResponse, unknown, FetchSettingsResponse, string[]>,
) => {
  const fetch = useAuthenticatedFetch();
  return useQuery({
    ...options,
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const { settings }: FetchSettingsResponse = await response.json();

      return {
        settings: {
          ...settings,
          defaultRate: toDollars(settings.defaultRate),
          depositShortcuts: settings.depositShortcuts.map(shortcutToDollars),
          discountShortcuts: settings.discountShortcuts.map(shortcutToDollars),
          depositRules: settings.depositRules.onlyAllowShortcuts
            ? settings.depositRules
            : {
                ...settings.depositRules,
                allowedCurrencyRange: currencyRangeToDollars(settings.depositRules.allowedCurrencyRange),
              },
          discountRules: settings.discountRules.onlyAllowShortcuts
            ? settings.discountRules
            : {
                ...settings.discountRules,
                allowedCurrencyRange: currencyRangeToDollars(settings.discountRules.allowedCurrencyRange),
              },
        },
      };
    },
  });
};

function shortcutToDollars(shortcut: { value: number; unit: Unit }) {
  return shortcut.unit === 'currency' ? { ...shortcut, value: toDollars(shortcut.value) } : shortcut;
}

function currencyRangeToDollars(currencyRange: CurrencyRange | null): CurrencyRange | null {
  return currencyRange ? ([toDollars(currencyRange[0]), toDollars(currencyRange[1])] as CurrencyRange) : null;
}
