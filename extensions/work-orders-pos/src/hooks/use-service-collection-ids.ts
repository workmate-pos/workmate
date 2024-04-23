import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';

export const useServiceCollectionIds = () => {
  const fetch = useAuthenticatedFetch();
  const settingsQuery = useSettingsQuery({ fetch });

  if (!settingsQuery.data) {
    return null;
  }

  const ids = [
    settingsQuery.data.settings.mutableServiceCollectionId,
    settingsQuery.data.settings.fixedServiceCollectionId,
  ].filter(isNonNullable);

  return ids;
};
