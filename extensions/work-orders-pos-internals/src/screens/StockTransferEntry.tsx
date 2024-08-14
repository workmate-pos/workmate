import {
  BadgeProps,
  Button,
  List,
  ListRow,
  ScrollView,
  Segment,
  SegmentedControl,
  Stack,
  Text,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useStockTransferCountQuery } from '@work-orders/common/queries/use-stock-transfer-count-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useRouter } from '../routes.js';
import { defaultCreateStockTransfer } from '../create-stock-transfer/default.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useStockTransferPageQuery } from '@work-orders/common/queries/use-stock-transfer-page-query.js';
import { Int } from '@web/schemas/generated/create-stock-transfer.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { DetailedStockTransfer } from '@web/services/stock-transfers/types.js';
import { StockTransferLineItemStatus } from '@web/services/db/queries/generated/stock-transfers.sql.js';
import { entries } from '@teifi-digital/shopify-app-toolbox/object';
import { getStockTransferLineItemStatusBadgeProps } from '../util/stock-transfer-line-item-status-badge-props.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useLocationQueries } from '@work-orders/common/queries/use-location-query.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';

const SEGMENT = {
  INCOMING_TRANSFERS: 'INCOMING_TRANSFERS',
  OUTGOING_TRANSFERS: 'OUTGOING_TRANSFERS',
} as const;

type SegmentId = (typeof SEGMENT)[keyof typeof SEGMENT];

export function StockTransferEntry() {
  const [selectedSegment, setSelectedSegment] = useState<SegmentId>(SEGMENT.INCOMING_TRANSFERS);

  const fetch = useAuthenticatedFetch();
  const { session } = useExtensionApi<'pos.home.modal.render'>();

  const locationId = createGid('Location', session.currentSession.locationId);

  const incomingTransferCountQuery = useStockTransferCountQuery({
    fetch,
    toLocationId: locationId,
    status: 'IN_TRANSIT',
  });

  const outgoingTransferCountQuery = useStockTransferCountQuery({
    fetch,
    fromLocationId: locationId,
    status: 'PENDING',
  });

  const segmentTitles: Record<SegmentId, string> = {
    [SEGMENT.INCOMING_TRANSFERS]: `Incoming Transfers (${incomingTransferCountQuery.data?.count ?? '?'})`,
    [SEGMENT.OUTGOING_TRANSFERS]: `Outgoing Transfers (${outgoingTransferCountQuery.data?.count ?? '?'})`,
  };

  const segment = {
    [SEGMENT.INCOMING_TRANSFERS]: <Transfers toLocationId={locationId} />,
    [SEGMENT.OUTGOING_TRANSFERS]: <Transfers fromLocationId={locationId} />,
  }[selectedSegment];

  const router = useRouter();

  return (
    <>
      <ScrollView>
        <SegmentedControl
          segments={Object.values(SEGMENT).map<Segment>(name => ({
            id: name,
            label: segmentTitles[name],
            disabled: false,
          }))}
          selected={selectedSegment}
          onSelect={setSelectedSegment}
        />

        {segment}

        {incomingTransferCountQuery.error && (
          <Text>
            {extractErrorMessage(
              incomingTransferCountQuery.error,
              'An error occurred while loading incoming transfers',
            )}
          </Text>
        )}

        {outgoingTransferCountQuery.error && (
          <Text>
            {extractErrorMessage(
              outgoingTransferCountQuery.error,
              'An error occurred while loading outgoing transfers',
            )}
          </Text>
        )}
      </ScrollView>

      <ResponsiveStack
        direction={'vertical'}
        spacing={0.5}
        paddingHorizontal={'HalfPoint'}
        paddingVertical={'HalfPoint'}
        flex={0}
      >
        {selectedSegment === 'INCOMING_TRANSFERS' && (
          <Button
            title={'New Incoming Transfer'}
            onPress={() =>
              router.push('StockTransfer', { initial: { ...defaultCreateStockTransfer, toLocationId: locationId } })
            }
          />
        )}
        {selectedSegment === 'OUTGOING_TRANSFERS' && (
          <Button
            title={'New Outgoing Transfer'}
            onPress={() =>
              router.push('StockTransfer', { initial: { ...defaultCreateStockTransfer, fromLocationId: locationId } })
            }
          />
        )}
      </ResponsiveStack>
    </>
  );
}

function Transfers({ fromLocationId, toLocationId }: { fromLocationId?: ID; toLocationId?: ID }) {
  const [query, setQuery] = useDebouncedState('');

  const fetch = useAuthenticatedFetch();
  const incomingStockTransfersQuery = useStockTransferPageQuery({
    fetch,
    query,
    toLocationId,
    fromLocationId,
    limit: 25 as Int,
  });

  const rows = useStockTransferRows(incomingStockTransfersQuery.data?.pages?.flat() ?? []);

  return (
    <>
      <ControlledSearchBar
        value={query}
        onTextChange={(query: string) => setQuery(query, !query)}
        onSearch={() => {}}
        placeholder={'Search transfer orders'}
      />
      <List data={rows} />
      {incomingStockTransfersQuery.isFetching && (
        <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            Loading stock transfers...
          </Text>
        </Stack>
      )}
      {!incomingStockTransfersQuery.isFetching && incomingStockTransfersQuery.isSuccess && rows.length === 0 && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No stock transfers found
          </Text>
        </Stack>
      )}
      {incomingStockTransfersQuery.isError && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(incomingStockTransfersQuery.error, 'Error loading stock transfers')}
          </Text>
        </Stack>
      )}
    </>
  );
}

function useStockTransferRows(stockTransfers: DetailedStockTransfer[]): ListRow[] {
  const router = useRouter();

  const fetch = useAuthenticatedFetch();

  const locationIds = unique(
    stockTransfers.flatMap(stockTransfer => [stockTransfer.fromLocationId, stockTransfer.toLocationId]),
  );
  const locationQueries = useLocationQueries({ fetch, ids: locationIds });

  return stockTransfers.map<ListRow>(stockTransfer => {
    const statusCount: Record<StockTransferLineItemStatus, number> = {
      IN_TRANSIT: 0,
      PENDING: 0,
      RECEIVED: 0,
      REJECTED: 0,
    };

    for (const lineItem of stockTransfer.lineItems) {
      statusCount[lineItem.status] += lineItem.quantity;
    }

    const fromLocationQuery = locationQueries[stockTransfer.fromLocationId];
    const toLocationQuery = locationQueries[stockTransfer.toLocationId];

    const getLocationName = (query: typeof fromLocationQuery | typeof toLocationQuery) => {
      if (query?.isLoading) return 'Loading...';
      return query?.data?.name ?? 'Unknown location';
    };

    const fromLocationSubtitle = 'From: ' + getLocationName(fromLocationQuery);
    const toLocationSubtitle = 'To: ' + getLocationName(toLocationQuery);

    return {
      id: stockTransfer.name,
      onPress: () => router.push('ExistingStockTransfer', { name: stockTransfer.name }),
      leftSide: {
        label: stockTransfer.name,
        subtitle: [fromLocationSubtitle, toLocationSubtitle],
        badges: entries(statusCount)
          .filter(([, quantity]) => quantity > 0)
          .map<BadgeProps>(([status, quantity]) => {
            const badgeProps = getStockTransferLineItemStatusBadgeProps(status);
            return {
              variant: badgeProps.variant,
              status: badgeProps.status,
              text: `${quantity} ${badgeProps.text}`,
            };
          }),
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}
