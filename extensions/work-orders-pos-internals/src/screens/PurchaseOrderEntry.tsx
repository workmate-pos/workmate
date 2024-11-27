import { Button, List, ListRow, Stack, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { useState } from 'react';
import { usePurchaseOrderInfoPageQuery } from '@work-orders/common/queries/use-purchase-order-info-page-query.js';
import { PurchaseOrderInfo } from '@web/services/purchase-orders/types.js';
import { useRouter } from '../routes.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { defaultCreatePurchaseOrder } from '@work-orders/common/create-purchase-order/default.js';
import { createPurchaseOrderFromPurchaseOrder } from '@work-orders/common/create-purchase-order/from-purchase-order.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { CustomFieldFilter } from '@web/services/custom-field-filters.js';
import { getCustomFieldFilterText } from '@work-orders/common-pos/screens/custom-fields/CustomFieldFilterConfig.js';
import { useCustomFieldsPresetsQuery } from '@work-orders/common/queries/use-custom-fields-presets-query.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';
import { useEmployeeQuery } from '@work-orders/common/queries/use-employee-query.js';

export function PurchaseOrderEntry() {
  const [query, setQuery] = useDebouncedState('');
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilter[]>([]);
  const [staffMemberId, setStaffMemberId] = useState<ID>();

  const fetch = useAuthenticatedFetch();
  const purchaseOrderInfoQuery = usePurchaseOrderInfoPageQuery({
    fetch,
    query,
    customFieldFilters,
    staffMemberId,
  });
  const purchaseOrders = purchaseOrderInfoQuery.data?.pages?.flat(1) ?? [];

  const settingsQuery = useSettingsQuery({ fetch });
  const customFieldsPresetsQuery = useCustomFieldsPresetsQuery({ fetch, type: 'PURCHASE_ORDER' });

  const purchaseOrderRows = usePurchaseOrderRows(purchaseOrders);

  const staffMemberQuery = useEmployeeQuery({ fetch, id: staffMemberId ?? null });

  const screen = useScreen();

  const isLoading = settingsQuery.isLoading || customFieldsPresetsQuery.isLoading;
  screen.setIsLoading(isLoading);

  const router = useRouter();
  const { session } = useApi<'pos.home.modal.render'>();

  if (isLoading) {
    return null;
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(settingsQuery.error, 'An error occurred while loading settings')}
        </Text>
      </Stack>
    );
  }

  if (customFieldsPresetsQuery.isError || !customFieldsPresetsQuery.data) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(customFieldsPresetsQuery.error, 'An error occurred while loading presets')}
        </Text>
      </Stack>
    );
  }

  return (
    <>
      <ResponsiveStack
        direction={'horizontal'}
        alignment={'space-between'}
        paddingVertical={'Small'}
        sm={{ direction: 'vertical', alignment: 'center' }}
      >
        <ResponsiveStack direction={'horizontal'} sm={{ alignment: 'center', paddingVertical: 'Small' }}>
          <Text variant="headingLarge">Purchase Orders</Text>
        </ResponsiveStack>
        <ResponsiveStack direction={'horizontal'} sm={{ direction: 'vertical' }}>
          <Button
            title={'Merge special orders'}
            type={'plain'}
            onPress={() => router.push('CreatePurchaseOrderSpecialOrderSelector', {})}
          />
          <Button
            title={'New purchase order'}
            type={'primary'}
            onPress={() => {
              const { purchaseOrders } = settingsQuery.data.settings;
              const createPurchaseOrder = defaultCreatePurchaseOrder({ status: purchaseOrders.defaultStatus });

              router.push('PurchaseOrder', {
                initial: {
                  ...createPurchaseOrder,
                  locationId: createGid('Location', session.currentSession.locationId),
                  customFields: {
                    ...customFieldsPresetsQuery.data.defaultCustomFields,
                    ...createPurchaseOrder.customFields,
                  },
                },
              });
            }}
          />
        </ResponsiveStack>
      </ResponsiveStack>

      <Stack direction="horizontal" alignment="center" flex={1} paddingHorizontal={'HalfPoint'}>
        <Text variant="body" color="TextSubdued">
          {purchaseOrderInfoQuery.isRefetching ? 'Reloading...' : ' '}
        </Text>
      </Stack>

      <ResponsiveStack
        direction={'horizontal'}
        alignment={'space-between'}
        paddingVertical={'Small'}
        sm={{ direction: 'vertical', alignment: 'center' }}
      >
        <Button
          title={'Filter custom fields'}
          type="plain"
          onPress={() =>
            router.push('CustomFieldFilterConfig', {
              onSave: setCustomFieldFilters,
              initialFilters: customFieldFilters,
            })
          }
        />
        <Button
          title="Filter staff member"
          type="plain"
          onPress={() =>
            router.push('EmployeeSelector', {
              onClear: () => setStaffMemberId(undefined),
              onSelect: employee => setStaffMemberId(employee.id),
            })
          }
        />
      </ResponsiveStack>

      <ResponsiveStack direction={'vertical'} spacing={1} paddingVertical={'ExtraSmall'}>
        {(customFieldFilters.length > 0 || !!staffMemberId) && (
          <>
            <Text variant="body" color="TextSubdued">
              Active filters:
            </Text>
            {customFieldFilters.map((filter, i) => (
              <Text key={i} variant="body" color="TextSubdued">
                • {getCustomFieldFilterText(filter)}
              </Text>
            ))}
            {!!staffMemberId && (
              <Text variant="body" color="TextSubdued">
                • Staff member is {staffMemberQuery.data?.name ?? 'unknown'}
              </Text>
            )}
          </>
        )}
      </ResponsiveStack>

      <ControlledSearchBar
        value={query}
        onTextChange={setQuery}
        onSearch={() => {}}
        placeholder={'Search purchase orders'}
      />
      <List
        data={purchaseOrderRows}
        onEndReached={purchaseOrderInfoQuery.fetchNextPage}
        isLoadingMore={purchaseOrderInfoQuery.isFetchingNextPage}
      />
      {purchaseOrderInfoQuery.isLoading && (
        <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            Loading purchase orders...
          </Text>
        </Stack>
      )}
      {purchaseOrderInfoQuery.isSuccess && purchaseOrderRows.length === 0 && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No purchase orders found
          </Text>
        </Stack>
      )}
      {purchaseOrderInfoQuery.isError && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(purchaseOrderInfoQuery.error, 'An error occurred while loading purchase orders')}
          </Text>
        </Stack>
      )}
    </>
  );
}

function usePurchaseOrderRows(purchaseOrders: PurchaseOrderInfo[]) {
  const router = useRouter();

  return purchaseOrders.map<ListRow>(purchaseOrder => ({
    id: purchaseOrder.name,
    onPress: () => {
      router.push('PurchaseOrder', { initial: createPurchaseOrderFromPurchaseOrder(purchaseOrder) });
    },
    leftSide: {
      label: purchaseOrder.name,
      subtitle: getPurchaseOrderSubtitle(purchaseOrder),
      badges: [
        {
          text: purchaseOrder.status,
          variant: 'highlight',
        },
        {
          text: sentenceCase(purchaseOrder.type),
          variant: 'neutral',
        },
      ],
    },
    rightSide: {
      showChevron: true,
    },
  }));
}

function getPurchaseOrderSubtitle(purchaseOrder: PurchaseOrderInfo) {
  return getSubtitle([
    purchaseOrder.supplier?.name,
    purchaseOrder.location?.name,
    purchaseOrder.linkedOrders.map(order => order.name).join(', ') || undefined,
    purchaseOrder.linkedCustomers.map(customer => customer.displayName).join(', ') || undefined,
  ]);
}
