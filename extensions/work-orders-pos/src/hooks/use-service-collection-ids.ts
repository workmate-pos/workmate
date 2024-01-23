import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from './use-authenticated-fetch.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';

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

  if (ids.length === 0) {
    return [createGid('Collection', '-1')];
  }

  return ids;
};
