import { BlockStack, Card, Text, TextField } from '@shopify/polaris';
import { WIPCreateStockTransfer } from '@work-orders/common/create-stock-transfer/reducer.js';
import { CreateStockTransferDispatchProxy } from '@work-orders/common/create-stock-transfer/reducer.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useState } from 'react';
import { LocationSelectorModal } from '@web/frontend/components/shared-orders/modals/LocationSelectorModal.js';

type Props = {
  createStockTransfer: WIPCreateStockTransfer;
  dispatch: CreateStockTransferDispatchProxy;
  disabled?: boolean;
};

export function StockTransferGeneralCard({ createStockTransfer, dispatch, disabled }: Props) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const [isFromLocationSelectorOpen, setIsFromLocationSelectorOpen] = useState(false);
  const [isToLocationSelectorOpen, setIsToLocationSelectorOpen] = useState(false);

  const fromLocationQuery = useLocationQuery({
    fetch,
    id: createStockTransfer.fromLocationId,
  });

  const toLocationQuery = useLocationQuery({
    fetch,
    id: createStockTransfer.toLocationId,
  });

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          General Information
        </Text>

        <BlockStack gap="400">
          <TextField
            label="From Location"
            autoComplete="off"
            requiredIndicator
            value={fromLocationQuery.data?.name ?? ''}
            loading={!!createStockTransfer.fromLocationId && fromLocationQuery.isLoading}
            onFocus={() => setIsFromLocationSelectorOpen(true)}
            disabled={disabled}
            readOnly
            error={!createStockTransfer.fromLocationId ? 'From location is required' : undefined}
          />

          <TextField
            label="To Location"
            autoComplete="off"
            requiredIndicator
            value={toLocationQuery.data?.name ?? ''}
            loading={!!createStockTransfer.toLocationId && toLocationQuery.isLoading}
            onFocus={() => setIsToLocationSelectorOpen(true)}
            disabled={disabled}
            readOnly
            error={!createStockTransfer.toLocationId ? 'To location is required' : undefined}
          />

          <TextField
            label="Notes"
            value={createStockTransfer.note}
            onChange={value => dispatch.setPartial({ note: value })}
            multiline={3}
            disabled={disabled}
            autoComplete="off"
          />
        </BlockStack>
      </BlockStack>

      {isFromLocationSelectorOpen && (
        <LocationSelectorModal
          open={isFromLocationSelectorOpen}
          onClose={() => setIsFromLocationSelectorOpen(false)}
          onSelect={locationId => dispatch.setPartial({ fromLocationId: locationId })}
        />
      )}

      {isToLocationSelectorOpen && (
        <LocationSelectorModal
          open={isToLocationSelectorOpen}
          onClose={() => setIsToLocationSelectorOpen(false)}
          onSelect={locationId => dispatch.setPartial({ toLocationId: locationId })}
        />
      )}

      {toast}
    </Card>
  );
}
