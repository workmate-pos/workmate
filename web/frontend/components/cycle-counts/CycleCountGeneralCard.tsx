import { Badge, BlockStack, Card, Text, TextField } from '@shopify/polaris';
import { CreateCycleCount } from '@web/schemas/generated/create-cycle-count.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { DateTime } from '@web/schemas/generated/create-work-order.js';
import { CreateCycleCountDispatch } from '@work-orders/common/create-cycle-count/reducer.js';
import { useState } from 'react';
import { DateModal } from '@web/frontend/components/shared-orders/modals/DateModal.js';
import { LocationSelectorModal } from '@web/frontend/components/shared-orders/modals/LocationSelectorModal.js';

interface Props {
  createCycleCount: CreateCycleCount;
  dispatch: CreateCycleCountDispatch;
  disabled: boolean;
  onLocationSelect: () => void;
}

export function CycleCountGeneralCard({ createCycleCount, dispatch, disabled }: Props) {
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const locationQuery = useLocationQuery({ fetch, id: createCycleCount.locationId });

  const dueDateUtc = createCycleCount.dueDate ? new Date(createCycleCount.dueDate) : null;

  return (
    <>
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd" fontWeight="bold">
            General
          </Text>

          <TextField
            label="Status"
            autoComplete="off"
            requiredIndicator
            value={createCycleCount.status}
            onChange={status => dispatch.setStatus({ status })}
            disabled={disabled}
          />

          <TextField
            label="Location"
            autoComplete="off"
            requiredIndicator
            value={locationQuery.data?.name ?? ''}
            loading={!!createCycleCount.locationId && locationQuery.isLoading}
            onFocus={() => setIsLocationSelectorOpen(true)}
            disabled={disabled}
            readOnly
          />

          <TextField
            label="Due date"
            autoComplete="off"
            value={dueDateUtc?.toLocaleDateString() ?? ''}
            onFocus={() => setIsDateModalOpen(true)}
            disabled={disabled}
            readOnly
            labelAction={
              dueDateUtc
                ? {
                    content: 'Remove',
                    onAction: () => dispatch.setDueDate({ dueDate: null }),
                  }
                : undefined
            }
          />

          <TextField
            label="Note"
            autoComplete="off"
            value={createCycleCount.note ?? ''}
            onChange={note => dispatch.setNote({ note })}
            disabled={disabled}
            multiline={3}
          />

          {createCycleCount.locked && <Badge tone="warning">This cycle count is locked</Badge>}
        </BlockStack>
      </Card>

      <DateModal
        open={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        onUpdate={dueDate => dispatch.setDueDate({ dueDate: dueDate.toISOString() as DateTime })}
        initialDate={dueDateUtc ?? new Date()}
        timezone={false}
      />

      <LocationSelectorModal
        open={isLocationSelectorOpen}
        onClose={() => setIsLocationSelectorOpen(false)}
        onSelect={locationId => dispatch.setLocation({ locationId })}
      />

      {toast}
    </>
  );
}
