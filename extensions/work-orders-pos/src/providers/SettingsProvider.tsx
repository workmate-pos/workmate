import { settingsContext } from '../hooks/use-settings';
import { useQuery } from 'react-query';
import { ReactNode, useState } from 'react';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';
import type { ShopSettings } from '../schemas/generated/shop-settings';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  const fetch = useAuthenticatedFetch();

  useQuery(
    ['settings'],
    async (): Promise<{ settings: ShopSettings }> => {
      return fetch(`/api/settings`).then(res => res.json());
    },
    {
      onSuccess({ settings }) {
        setSettings(settings);
      },
    },
  );

  return <settingsContext.Provider value={settings}>{children}</settingsContext.Provider>;
}
