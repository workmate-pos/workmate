import { createContext, ReactNode, useContext } from 'react';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';

const SettingsContext = createContext<ReturnType<typeof useSettingsQuery> | null>(null);

export const useSettings = () => {
  const query = useContext(SettingsContext);

  if (!query?.data?.settings) {
    throw new Error(
      'No settings found. Did you forget to wrap your component in a SettingsProvider? Or did you not check for settings before rendering a screen?',
    );
  }

  return query.data.settings;
};

export const useSettingsInternal = () => {
  return useContext(SettingsContext);
};

/**
 * Settings MUST be loaded for the app to function, so instead of directly using the useSettingsQuery hook, we do that
 * here to ensure that the settings are always available.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });

  return <SettingsContext.Provider value={settingsQuery}>{children}</SettingsContext.Provider>;
}
