import { Badge, BlockStack, Card, Text, TextField, Select, InlineStack } from '@shopify/polaris';
import { CreateCycleCount } from '@web/schemas/generated/create-cycle-count.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { DateTime } from '@web/schemas/generated/create-work-order.js';
import { CreateCycleCountDispatchProxy } from '@work-orders/common/create-cycle-count/reducer.js';
import { useState } from 'react';
import { DateModal } from '@web/frontend/components/shared-orders/modals/DateModal.js';
import { LocationSelectorModal } from '@web/frontend/components/shared-orders/modals/LocationSelectorModal.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { MultiStaffMemberSelectorModal } from '../selectors/MultiStaffMemberSelectorModal.js';

type Props = {
  createCycleCount: CreateCycleCount;
  dispatch: CreateCycleCountDispatchProxy;
  disabled: boolean;
  onLocationSelect: () => void;
};

export function CycleCountGeneralCard({ createCycleCount, dispatch, disabled }: Props) {
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isEmployeeSelectorOpen, setIsEmployeeSelectorOpen] = useState(false);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const settingsQuery = useSettingsQuery({ fetch });
  const locationQuery = useLocationQuery({ fetch, id: createCycleCount.locationId });

  // Get employee information
  const employeeIds = unique(createCycleCount.employeeAssignments.map(assignment => assignment.employeeId));
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });

  const dueDate = createCycleCount.dueDate ? new Date(createCycleCount.dueDate) : null;
  const statusOptions = settingsQuery.data?.settings.cycleCount.statuses ?? [];

  // Get employee names for display
  const employeeNames = employeeIds
    .map(id => {
      const query = employeeQueries[id];
      if (query?.isLoading) return 'Loading...';
      return query?.data?.name;
    })
    .filter(isNonNullable);

  return (
    <>
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd" fontWeight="bold">
              General
            </Text>
            <Select
              label="Status"
              labelHidden
              options={statusOptions}
              value={createCycleCount.status}
              onChange={status => dispatch.setStatus({ status })}
              disabled={disabled}
            />
          </InlineStack>

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
            label="Assigned employees"
            autoComplete="off"
            value={employeeNames.join(', ')}
            onFocus={() => setIsEmployeeSelectorOpen(true)}
            disabled={disabled}
            readOnly
          />

          <TextField
            label="Due date"
            autoComplete="off"
            value={dueDate?.toLocaleDateString() ?? ''}
            onFocus={() => setIsDateModalOpen(true)}
            disabled={disabled}
            readOnly
            labelAction={
              dueDate
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
        initialDate={dueDate ?? new Date()}
        timezone={false}
      />

      <LocationSelectorModal
        open={isLocationSelectorOpen}
        onClose={() => setIsLocationSelectorOpen(false)}
        onSelect={locationId => dispatch.setLocation({ locationId })}
      />

      <MultiStaffMemberSelectorModal
        open={isEmployeeSelectorOpen}
        onClose={() => setIsEmployeeSelectorOpen(false)}
        selected={createCycleCount.employeeAssignments.map(assignment => assignment.employeeId)}
        onChange={employeeIds => {
          dispatch.setEmployeeAssignments({
            employeeAssignments: employeeIds.map(employeeId => ({ employeeId })),
          });
        }}
      />

      {toast}
    </>
  );
}
