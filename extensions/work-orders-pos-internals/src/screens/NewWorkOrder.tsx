import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { Stack, Text, useCartSubscription, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { WorkOrder } from './WorkOrder.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useEffect } from 'react';
import { defaultCreateWorkOrder } from '@work-orders/common/create-work-order/default.js';

/**
 * A wrapper around WorkOrder that shows a loading indicator while loading defaults etc.
 */
export function NewWorkOrder() {
  const fetch = useAuthenticatedFetch();

  const cart = useCartSubscription();
  const { toast, session } = useApi<'pos.home.modal.render'>();

  const settingsQuery = useSettingsQuery({ fetch });
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery(
    { fetch, type: 'WORK_ORDER' },
    { refetchOnMount: 'always' },
  );

  const isLoading = settingsQuery.isLoading || customFieldsPresetsQuery.isLoading;

  const screen = useScreen();
  screen.setIsLoading(isLoading);

  const defaultCustomerId = cart?.customer?.id ? createGid('Customer', cart.customer.id) : null;

  useEffect(() => {
    if (defaultCustomerId) {
      toast.show('Imported customer from cart');
    }
  }, []);

  if (isLoading) {
    return null;
  }

  if (settingsQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(settingsQuery.error, 'An error occurred while loading settings')}
        </Text>
      </Stack>
    );
  }

  if (!settingsQuery.data) {
    return null;
  }

  if (customFieldsPresetsQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(customFieldsPresetsQuery.error, 'An error occurred while loading presets')}
        </Text>
      </Stack>
    );
  }

  if (!customFieldsPresetsQuery.data) {
    return null;
  }

  const createWorkOrder = defaultCreateWorkOrder({
    status: settingsQuery.data.settings.workOrders.defaultStatus,
  });

  return (
    <WorkOrder
      initial={{
        ...createWorkOrder,
        customFields: {
          ...customFieldsPresetsQuery.data.defaultCustomFields,
          ...createWorkOrder.customFields,
        },
        customerId: defaultCustomerId,
        locationId: createGid('Location', session.currentSession.locationId),
      }}
    />
  );
}
