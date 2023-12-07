import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';
import type { ShopSettings, Unit } from '../../schemas/generated/shop-settings';
import { toCents } from '../util/money';

export const useSettingsMutation = (options: UseMutationOptions<void, unknown, ShopSettings, string[]>) => {
  const fetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (settings: ShopSettings) => {
      await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          ...settings,
          // TODO: Maybe don't do this here, but in the settings page state level?
          defaultRate: toCents(settings.defaultRate),
          depositShortcuts: settings.depositShortcuts.map(shortcutToCents),
          discountShortcuts: settings.discountShortcuts.map(shortcutToCents),
          depositRules: settings.depositRules.onlyAllowShortcuts
            ? settings.depositRules
            : {
                ...settings.depositRules,
                allowedCurrencyRange: currencyRangeToCents(settings.depositRules.allowedCurrencyRange),
              },
          discountRules: settings.discountRules.onlyAllowShortcuts
            ? settings.discountRules
            : {
                ...settings.discountRules,
                allowedCurrencyRange: currencyRangeToCents(settings.discountRules.allowedCurrencyRange),
              },
        }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess(...args) {
      queryClient.invalidateQueries(['settings']);

      options.onSuccess?.(...args);
    },
  });
};

function shortcutToCents(shortcut: { value: number; unit: Unit }) {
  return shortcut.unit === 'currency' ? { ...shortcut, value: toCents(shortcut.value) } : shortcut;
}

function currencyRangeToCents(currencyRange: [number, number] | null): [number, number] | null {
  return currencyRange ? ([toCents(currencyRange[0]), toCents(currencyRange[1])] as [number, number]) : null;
}
