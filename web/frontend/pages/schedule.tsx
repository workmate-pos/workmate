import '../assets/polaris-calendar.css';

import { Box, Card, FormLayout, Frame, Modal, Page, Tabs, TextField } from '@shopify/polaris';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { ReactNode, useEffect, useState } from 'react';
import {
  DetailedEmployeeScheduleItem,
  useEmployeeScheduleItemQuery,
} from '@work-orders/common/queries/use-employee-schedule-item-query.js';
import { useEmployeeScheduleItemMutation } from '@work-orders/common/queries/use-employee-schedule-item-mutation.js';
import type { TabProps } from '@shopify/polaris/build/ts/src/components/Tabs/types.js';
import { YourSchedule } from '@web/frontend/components/schedules/YourSchedule.js';
import { ManageSchedules } from '@web/frontend/components/schedules/ManageSchedules.js';
import { DateTimeField } from '@web/frontend/components/form/DateTimeField.js';
import { YourAvailability } from '@web/frontend/components/schedules/YourAvailability.js';

export default function Schedule() {
  // schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"

  const [selectedItem, setSelectedItem] = useState<SelectedItem>();

  // TODO: Filter options (by employee, draft, normal, etc)
  // TODO: Creating new events
  // TODO: Drag and drop
  // TODO: Editing events
  // TODO: Timeline view by employee
  // TODO: Creating,editing tasks
  /// TODO: Publising schedules

  // TODO: Only schedule with right permissions

  const tabs = [
    {
      id: 'your-schedule',
      content: 'Your Schedule',
      tab: <YourSchedule />,
    },
    {
      id: 'your-availability',
      content: 'Your Availability',
      tab: <YourAvailability />,
    },
    {
      id: 'manage-schedules',
      content: 'Manage Schedules',
      tab: <ManageSchedules />,
    },
  ] as const satisfies (Omit<TabProps, 'selected'> & { tab: ReactNode })[];

  const [selectedTab, setSelectedTab] = useState<(typeof tabs)[number]['id']>('your-schedule');

  return (
    <Frame>
      <Page fullWidth={selectedTab === 'manage-schedules'}>
        <Card padding={'100'}>
          <Tabs
            fitted
            tabs={tabs.map(tab => ({
              ...tab,
              selected: tab.id === selectedTab,
              onAction: () => setSelectedTab(tab.id),
            }))}
            selected={tabs.findIndex(tab => tab.id === selectedTab)}
          />

          <Box paddingBlock={'800'} paddingInline={'400'}>
            {tabs.find(tab => tab.id === selectedTab)?.tab}
          </Box>
        </Card>

        <ScheduleItemModal selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      </Page>
    </Frame>
  );
}

type SelectedItem = { scheduleId: number; itemId: number };

function ScheduleItemModal({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem | undefined;
  setSelectedItem: (item: SelectedItem | undefined) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [item, setItem] = useState<DetailedEmployeeScheduleItem>();

  const itemQuery = useEmployeeScheduleItemQuery({
    fetch,
    scheduleId: selectedItem?.scheduleId ?? null,
    itemId: selectedItem?.itemId ?? null,
  });

  useEffect(() => {
    if (itemQuery.data) {
      setItem({
        ...itemQuery.data,
        start: new Date(itemQuery.data.start),
        end: new Date(itemQuery.data.end),
        createdAt: new Date(itemQuery.data.createdAt),
        updatedAt: new Date(itemQuery.data.updatedAt),
      });
    } else {
      setItem(undefined);
    }
  }, [itemQuery.data]);

  const itemMutation = useEmployeeScheduleItemMutation(
    { fetch },
    {
      onSuccess() {
        setToastAction({ content: 'Saved schedule item' });
        setSelectedItem(undefined);
      },
    },
  );

  const disabled = itemQuery.isFetching || !item || itemMutation.isPending;

  return (
    <>
      <Modal
        open={!!selectedItem}
        title={'Edit Schedule Item'}
        onClose={() => setSelectedItem(undefined)}
        loading={itemQuery.isFetching}
        primaryAction={{
          content: 'Save',
          disabled,
          loading: itemMutation.isPending,
          onAction: () => {
            if (!selectedItem || !item) return;
            const { scheduleId, itemId } = selectedItem;
            if (!scheduleId || !itemId) return;

            itemMutation.mutate({
              scheduleId,
              itemId,
              name: item.name,
              description: item.description,
              staffMemberIds: item.assignedStaffMemberIds,
              taskIds: item.taskIds,
              color: '#a0a0a0',
              start: item.start,
              end: item.end,
            });
          },
        }}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label={'Name'}
              autoComplete="off"
              value={item?.name}
              onChange={name => setItem(item => (item ? { ...item, name } : undefined))}
              disabled={disabled}
            />
            <TextField
              label={'Description'}
              autoComplete="off"
              value={item?.description}
              onChange={description => setItem(item => (item ? { ...item, description } : undefined))}
              disabled={disabled}
            />
            <DateTimeField
              label={'Start'}
              value={item?.start}
              onChange={start => setItem(item => (item ? { ...item, start } : undefined))}
              disabled={disabled}
              requiredIndicator
            />
            <DateTimeField
              label={'End'}
              value={item?.end}
              onChange={end => setItem(item => (item ? { ...item, end } : undefined))}
              disabled={disabled}
              requiredIndicator
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
      {toast}
    </>
  );
}
