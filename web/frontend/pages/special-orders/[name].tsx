import { BlockStack, Box, Button, ButtonGroup, Card, EmptyState, Frame, Page, Text } from '@shopify/polaris';
import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { useLocation } from 'react-router-dom';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { ContextualSaveBar, Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { emptyState } from '@web/frontend/assets/index.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useState } from 'react';
import { useStorePropertiesQuery } from '@work-orders/common/queries/use-store-properties-query.js';
import { defaultCreateSpecialOrder, WIPCreateSpecialOrder } from '@work-orders/common/create-special-order/default.js';
import { getCreateSpecialOrderFromDetailedSpecialOrder } from '@work-orders/common/create-special-order/get-create-special-order-from-detailed-special-order.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useCompanyQuery } from '@work-orders/common/queries/use-company-query.js';
import { useCompanyLocationQuery } from '@work-orders/common/queries/use-company-location-query.js';
import { useSpecialOrderMutation } from '@work-orders/common/queries/use-special-order-mutation.js';
import { SpecialOrderGeneralCard } from '@web/frontend/components/special-orders/SpecialOrderGeneralCard.js';
import { SpecialOrderLineItemsCard } from '@web/frontend/components/special-orders/SpecialOrderLineItemsCard.js';
import { SpecialOrderNotificationHistoryModal } from '@web/frontend/components/special-orders/modals/SpecialOrderNotificationHistoryModal.js';
import { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { SpecialOrderNotificationModal } from '@web/frontend/components/special-orders/modals/SpecialOrderNotificationModal.js';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_special_orders']}>
          <SpecialOrderLoader />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function SpecialOrderLoader() {
  const location = useLocation();
  const name = decodeURIComponent(location.pathname.split('/').pop() ?? '');

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const specialOrderQuery = useSpecialOrderQuery({ fetch, name }, { enabled: name !== 'new', retry: false });
  const settingsQuery = useSettingsQuery({ fetch });

  const app = useAppBridge();

  if (!name) {
    Redirect.create(app).dispatch(Redirect.Action.APP, '/special-orders');
    return null;
  }

  if (specialOrderQuery.isError || settingsQuery.isError) {
    return (
      <Card>
        <EmptyState
          heading={'An error occurred'}
          image={emptyState}
          action={{
            content: 'Retry',
            onAction: () => specialOrderQuery.refetch(),
          }}
        >
          {specialOrderQuery.isError && (
            <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
              {extractErrorMessage(specialOrderQuery.error, 'An error occurred while loading special order')}
            </Text>
          )}
        </EmptyState>

        {toast}
      </Card>
    );
  }

  if ([specialOrderQuery, settingsQuery].some(query => query.isLoading)) {
    return (
      <>
        <Loading />
        {toast}
      </>
    );
  }

  return (
    <>
      <SpecialOrder
        initial={
          name === 'new' || !specialOrderQuery.data
            ? defaultCreateSpecialOrder
            : getCreateSpecialOrderFromDetailedSpecialOrder(specialOrderQuery.data)
        }
      />
      {toast}
    </>
  );
}

type SpecialOrderNotification = NonNullable<ShopSettings['specialOrders']['notifications']>[number];

function SpecialOrder({ initial }: { initial: WIPCreateSpecialOrder }) {
  const [lastSavedSpecialOrder, setLastSavedSpecialOrder] = useState(initial);
  const [createSpecialOrder, setCreateSpecialOrder] = useState(initial);

  const hasUnsavedChanges =
    JSON.stringify(createSpecialOrder, Object.keys(createSpecialOrder).sort()) !==
    JSON.stringify(lastSavedSpecialOrder, Object.keys(lastSavedSpecialOrder).sort());

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const specialOrderQuery = useSpecialOrderQuery({ fetch, name: createSpecialOrder.name });
  const storePropertiesQuery = useStorePropertiesQuery({ fetch });
  const locationQuery = useLocationQuery({ fetch, id: createSpecialOrder.locationId });
  const customerQuery = useCustomerQuery({ fetch, id: createSpecialOrder.customerId });
  const companyQuery = useCompanyQuery({ fetch, id: createSpecialOrder.companyId });
  const companyLocationQuery = useCompanyLocationQuery({ fetch, id: createSpecialOrder.companyLocationId });
  const settingsQuery = useSettingsQuery({ fetch });

  const specialOrderMutation = useSpecialOrderMutation({ fetch });

  const bannerQueries = {
    specialOrderQuery,
    storePropertiesQuery,
    locationQuery,
    customerQuery,
    companyQuery,
    companyLocationQuery,
    settingsQuery,
  };

  const disabled = Object.values(bannerQueries).some(query => query.isError) || specialOrderMutation.isLoading;

  const [availableNotifications, setAvailableNotifications] = useState<SpecialOrderNotification[]>([]);

  const saveSpecialOrder = () => {
    const { locationId, customerId } = createSpecialOrder;

    if (!locationId) {
      setToastAction({ content: 'Location is required' });
      return;
    }

    if (!customerId) {
      setToastAction({ content: 'Customer is required' });
      return;
    }

    specialOrderMutation.mutate(
      { ...createSpecialOrder, locationId, customerId },
      {
        onSuccess(specialOrder) {
          const createSpecialOrder = getCreateSpecialOrderFromDetailedSpecialOrder(specialOrder);
          setLastSavedSpecialOrder(createSpecialOrder);
          setCreateSpecialOrder(createSpecialOrder);
          setToastAction({ content: `Saved special order ${specialOrder.name}` });

          if (settingsQuery.data) {
            setAvailableNotifications(
              settingsQuery.data.settings.specialOrders.notifications?.filter(notification => {
                if (notification.type === 'on-create') {
                  return !lastSavedSpecialOrder;
                }

                if (notification.type === 'on-any-item-received' || notification.type === 'on-all-items-received') {
                  return false;
                }

                return notification satisfies never;
              }) ?? [],
            );
          }
        },
      },
    );
  };

  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  return (
    <Box paddingBlockEnd={'1600'}>
      <TitleBar
        title={'Special Orders'}
        secondaryActions={[
          {
            content: 'Notifications',
            onAction: () => setIsNotificationsModalOpen(true),
          },
        ]}
      />

      <ContextualSaveBar
        fullWidth
        visible={hasUnsavedChanges}
        saveAction={{
          loading: specialOrderMutation.isLoading,
          onAction: saveSpecialOrder,
          disabled,
        }}
        discardAction={{
          onAction: () => setCreateSpecialOrder(lastSavedSpecialOrder),
        }}
      />

      <BlockStack gap={'400'}>
        <Text as={'h1'} variant={'headingLg'} fontWeight={'bold'}>
          {createSpecialOrder.name ?? 'New special order'}
        </Text>

        <SpecialOrderGeneralCard
          createSpecialOrder={createSpecialOrder}
          setCreateSpecialOrder={setCreateSpecialOrder}
          disabled={disabled}
        />

        <SpecialOrderLineItemsCard
          createSpecialOrder={createSpecialOrder}
          setCreateSpecialOrder={setCreateSpecialOrder}
          disabled={disabled}
        />

        <ButtonGroup fullWidth>
          <Button disabled={disabled} loading={specialOrderMutation.isLoading} onClick={saveSpecialOrder}>
            Save
          </Button>
        </ButtonGroup>
      </BlockStack>

      <SpecialOrderNotificationHistoryModal
        name={createSpecialOrder.name}
        disabled={disabled}
        open={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
      />

      <SpecialOrderNotificationModal
        name={createSpecialOrder.name}
        notifications={availableNotifications}
        setNotifications={setAvailableNotifications}
      />

      {toast}
    </Box>
  );
}
