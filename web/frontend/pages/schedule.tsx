import '../assets/polaris-calendar.css';

import { Box, Card, FormLayout, Frame, Modal, Page, Tabs, TextField } from '@shopify/polaris';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { ReactNode, useEffect, useState } from 'react';
import { DetailedScheduleEvent, useScheduleEventQuery } from '@work-orders/common/queries/use-schedule-event-query.js';
import { useScheduleEventMutation } from '@work-orders/common/queries/use-schedule-event-mutation.js';
import type { TabProps } from '@shopify/polaris/build/ts/src/components/Tabs/types.js';
import { YourSchedule } from '@web/frontend/components/schedules/YourSchedule.js';
import { ManageSchedules } from '@web/frontend/components/schedules/ManageSchedules.js';
import { DateTimeField } from '@web/frontend/components/form/DateTimeField.js';
import { YourAvailability } from '@web/frontend/components/schedules/YourAvailability.js';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { useSearchParams } from 'react-router-dom';
import { TitleBar } from '@shopify/app-bridge-react';

export default function Schedule() {
  // schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"

  const [selectedItem, setSelectedItem] = useState<SelectedItem>();

  const fetch = useAuthenticatedFetch({ setToastAction: () => {} });
  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });
  const canManageSchedules =
    currentEmployeeQuery.data?.superuser || currentEmployeeQuery.data?.permissions?.includes('manage_schedules');

  const tabs = [
    {
      id: 'your-schedule',
      content: 'Your Schedule',
      tab: <YourSchedule />,
      hidden: false,
    },
    {
      id: 'your-availability',
      content: 'Your Availability',
      tab: <YourAvailability />,
      hidden: false,
    },
    {
      id: 'manage-schedules',
      content: 'Manage Schedules',
      tab: <ManageSchedules />,
      hidden: !canManageSchedules,
    },
  ] as const satisfies (Omit<TabProps, 'selected'> & { hidden: boolean; tab: ReactNode })[];

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = searchParams.get('tab') ?? tabs[0].id;
  const setSelectedTab = (tab: (typeof tabs)[number]['id']) => setSearchParams({ tab });

  return (
    <Frame>
      <Page fullWidth={selectedTab === 'manage-schedules'}>
        <TitleBar title="Schedule" />

        <Card padding={'100'}>
          <Tabs
            fitted
            tabs={tabs
              .filter(tab => !tab.hidden)
              .map(tab => ({
                ...tab,
                selected: tab.id === selectedTab,
                onAction: () => setSelectedTab(tab.id),
              }))}
            selected={Math.max(
              0,
              tabs.findIndex(tab => tab.id === selectedTab),
            )}
          />

          <Box paddingBlock={'800'} paddingInline={'400'}>
            {tabs.find(tab => tab.id === selectedTab)?.tab}
          </Box>
        </Card>

        <ScheduleEventModal selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      </Page>
    </Frame>
  );
}

type SelectedItem = { scheduleId: number; eventId: number };

function ScheduleEventModal({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem | undefined;
  setSelectedItem: (item: SelectedItem | undefined) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [item, setItem] = useState<DetailedScheduleEvent>();

  const eventQuery = useScheduleEventQuery({
    fetch,
    scheduleId: selectedItem?.scheduleId ?? null,
    eventId: selectedItem?.eventId ?? null,
  });

  useEffect(() => {
    if (eventQuery.data) {
      setItem({
        ...eventQuery.data,
        start: new Date(eventQuery.data.start),
        end: new Date(eventQuery.data.end),
        createdAt: new Date(eventQuery.data.createdAt),
        updatedAt: new Date(eventQuery.data.updatedAt),
      });
    } else {
      setItem(undefined);
    }
  }, [eventQuery.data]);

  const eventMutation = useScheduleEventMutation(
    { fetch },
    {
      onSuccess() {
        setToastAction({ content: 'Saved schedule item' });
        setSelectedItem(undefined);
      },
    },
  );

  const disabled = eventQuery.isFetching || !item || eventMutation.isPending;

  return (
    <>
      <Modal
        open={!!selectedItem}
        title={'Edit Schedule Item'}
        onClose={() => setSelectedItem(undefined)}
        loading={eventQuery.isFetching}
        primaryAction={{
          content: 'Save',
          disabled,
          loading: eventMutation.isPending,
          onAction: () => {
            if (!selectedItem || !item) return;
            const { scheduleId, eventId } = selectedItem;
            if (!scheduleId || !eventId) return;

            eventMutation.mutate({
              scheduleId,
              eventId,
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
