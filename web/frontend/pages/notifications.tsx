import {
  BlockStack,
  Button,
  Card,
  EmptyState,
  Frame,
  Icon,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  Page,
  SkeletonBodyText,
  Text,
  Tooltip,
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { useState } from 'react';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { NotificationsPaginationOptions } from '@web/schemas/generated/notifications-pagination-options.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useNotificationsQuery } from '@work-orders/common/queries/use-notifications-query.js';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { CircleAlertMajor, SendMajor, SkeletonMajor, StatusActiveMajor } from '@shopify/polaris-icons';
import { UUID } from '@work-orders/common/util/uuid.js';

const PAGE_LIMIT = 100;

export default function Notifications() {
  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const [mode, setMode] = useState<IndexFiltersMode>(IndexFiltersMode.Default);
  const [filters, setFilters] = useState<Omit<NotificationsPaginationOptions, 'offset' | 'limit'>>({});

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [resentNotificationUuids, setResentNotificationUuids] = useState<UUID[]>([]);

  const notificationsQuery = useNotificationsQuery(
    { fetch, filters: { ...filters, limit: PAGE_LIMIT, query } },
    {
      keepPreviousData: true,
      refetchInterval: resentNotificationUuids.length > 0 ? 5_000 : undefined,
    },
  );
  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, notificationsQuery);
  const page = notificationsQuery.data?.pages[pageIndex] ?? [];
  const itemCount = notificationsQuery.data?.pages.flat().length ?? 0;

  return (
    <Frame>
      <Page>
        <TitleBar title="Notifications" />

        <IndexFilters
          mode={mode}
          setMode={setMode}
          filters={[]}
          onQueryChange={query => setQuery(query, !query)}
          onQueryClear={() => setQuery('', true)}
          onClearAll={() => {
            setQuery('', true);
            setFilters({});
          }}
          queryValue={optimisticQuery}
          queryPlaceholder={'Search notifications'}
          tabs={[]}
          selected={0}
          loading={notificationsQuery.isFetching}
        />

        <IndexTable
          headings={[
            { title: 'Notification ID' },
            { title: 'Type' },
            { title: 'Recipient' },
            { title: 'Message' },
            { title: 'Status', alignment: 'center' },
            { title: 'Sent Date' },
          ]}
          sortable={[false, false, false, false, false, true]}
          sortDirection={filters.order}
          sortColumnIndex={5}
          onSort={(_, order) => {
            setPageIndex(0);
            setFilters({ ...filters, order });
          }}
          itemCount={itemCount}
          hasMoreItems={pagination.hasNextPage}
          pagination={{
            hasNext: pagination.hasNextPage,
            hasPrevious: pagination.hasPreviousPage,
            onNext: pagination.next,
            onPrevious: pagination.previous,
          }}
          resourceName={{ singular: 'notification', plural: 'notifications' }}
          emptyState={
            <Card>
              <EmptyState heading={'Notifications'} image={emptyState}>
                No notifications yet
              </EmptyState>
            </Card>
          }
          selectable={false}
        >
          {page.length === 0 &&
            notificationsQuery.isFetching &&
            Array.from({ length: PAGE_LIMIT }).map((_, i) => (
              <IndexTable.Row key={i} id={String(i)} selected={false} position={i}>
                <IndexTable.Cell>
                  <SkeletonBodyText lines={1} />
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <SkeletonBodyText lines={1} />
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <SkeletonBodyText lines={1} />
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <SkeletonBodyText lines={1} />
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Icon source={SkeletonMajor} />
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <SkeletonBodyText lines={1} />
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}

          {page.map((notification, i) => (
            <IndexTable.Row id={notification.uuid} key={notification.uuid} position={i}>
              <IndexTable.Cell>
                <Text as="p" truncate>
                  {notification.uuid}
                </Text>
              </IndexTable.Cell>

              <IndexTable.Cell>{notification.type}</IndexTable.Cell>

              <IndexTable.Cell>{notification.recipient}</IndexTable.Cell>

              <IndexTable.Cell>{notification.message}</IndexTable.Cell>

              <IndexTable.Cell>
                {resentNotificationUuids.includes(notification.uuid) ? (
                  <Icon source={SendMajor} tone="magic" />
                ) : notification.failed ? (
                  // <Tooltip content={'This notification failed to send. Click to retry.'}>
                  //   <BlockStack align="center" inlineAlign="center">
                  //     <Button
                  //       variant="plain"
                  //       icon={<Icon source={CircleAlertMajor} tone="critical" />}
                  //       onClick={() => {
                  //         // TODO: send req to backend to resend it, but only allow recent notifications to prevent context changing somehow (or version mbby?)
                  //         setResentNotificationUuids([...resentNotificationUuids, notification.uuid]);
                  //       }}
                  //     >
                  //       {''}
                  //     </Button>
                  //   </BlockStack>
                  // </Tooltip>
                  <Icon source={CircleAlertMajor} tone="critical" />
                ) : (
                  <Icon source={StatusActiveMajor} tone="success" />
                )}
              </IndexTable.Cell>

              <IndexTable.Cell>{new Date(notification.createdAt).toLocaleString()}</IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      </Page>

      {toast}
    </Frame>
  );
}
