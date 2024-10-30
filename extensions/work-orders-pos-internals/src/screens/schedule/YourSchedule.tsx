import {
  Banner,
  Button,
  List,
  ScrollView,
  SegmentedControl,
  Stack,
  Text,
  useApi,
} from '@shopify/ui-extensions-react/point-of-sale';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useState } from 'react';
import { DAY_IN_MS } from '@work-orders/common/time/constants.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useScheduleEventsQuery } from '@work-orders/common/queries/use-schedule-events-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useTaskQueries } from '@work-orders/common/queries/use-task-query.js';
import { useRouter } from '../../routes.js';

const ranges = ['day', '7 days', '30 days'] as const;
type Range = (typeof ranges)[number];

const rangeMs = {
  day: DAY_IN_MS,
  // + DAY because we want to include the last day of the 7 days too (same for months)
  '7 days': 7 * DAY_IN_MS + DAY_IN_MS,
  '30 days': 30 * DAY_IN_MS + DAY_IN_MS,
};

export function YourSchedule() {
  const router = useRouter();

  const [range, setRange] = useState<Range>('day');
  const [from, setFrom] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
  );

  // - 1 because inclusive
  const to = new Date(from.getTime() + rangeMs[range] - 1);

  const { session } = useApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();
  const scheduleEventsQuery = useScheduleEventsQuery({
    fetch,
    id: 'all',
    filters: {
      from,
      to,
      published: true,
      staffMemberIds: [createGid('StaffMember', session.currentSession.staffMemberId ?? session.currentSession.userId)],
    },
  });

  const taskIds = unique(scheduleEventsQuery.data?.flatMap(event => event.taskIds) ?? []);
  const taskQueries = useTaskQueries({ fetch, ids: taskIds });

  return (
    <>
      <ScrollView>
        <Stack direction="vertical" spacing={2} paddingVertical={'ExtraLarge'}>
          <Stack direction="horizontal" alignment="center">
            <Text variant="headingLarge">Your Schedule</Text>
          </Stack>

          <Stack direction="horizontal" alignment="center">
            <Text variant="headingSmall">
              {(isSameDay(from, to) ? [from] : [from, to]).map(date => date.toLocaleDateString()).join(' - ')}
            </Text>
          </Stack>

          <SegmentedControl
            segments={ranges.map(range => ({
              id: range,
              label: titleCase(range),
              disabled: false,
            }))}
            onSelect={range => setRange(range as Range)}
            selected={range}
          />
        </Stack>

        <Banner
          visible={scheduleEventsQuery.isError}
          title="Error loading schedule events"
          variant="error"
          action="Retry"
          onPress={() => scheduleEventsQuery.refetch()}
        >
          {extractErrorMessage(scheduleEventsQuery.error, 'An error occurred while loading the schedule events')}
        </Banner>

        {scheduleEventsQuery.isLoading && <Button type="plain" isLoading title="" />}

        {scheduleEventsQuery.data?.length === 0 && (
          <Stack direction="horizontal" alignment="center">
            <Text variant="body" color="TextSubdued">
              No scheduled events
            </Text>
          </Stack>
        )}

        <List
          data={
            scheduleEventsQuery.data?.map(event => {
              const tasks = event.taskIds.map(taskId => taskQueries[taskId]?.data);
              const taskCount = tasks.length;
              const taskDoneCount = tasks.filter(task => task?.done).length;

              return {
                id: event.id.toString(),
                leftSide: {
                  label: event.name,
                  subtitle: getSubtitle([`${event.start.toLocaleString()} - ${event.end.toLocaleString()}`]),
                  badges: [
                    ...(event.taskIds.length
                      ? [
                          {
                            text: `${event.taskIds.length} tasks`,
                            variant: taskCount > taskDoneCount ? 'warning' : 'success',
                            status: taskCount === 0 ? 'empty' : taskCount > taskDoneCount ? 'partial' : 'complete',
                          } as const,
                        ]
                      : []),
                  ],
                },
                rightSide: {
                  showChevron: true,
                },
                onPress: () => {
                  router.push('EventInfo', {
                    scheduleId: event.scheduleId,
                    eventId: event.id,
                  });
                },
              };
            }) ?? []
          }
        />
      </ScrollView>

      <ResponsiveGrid
        columns={3}
        smColumns={3}
        grow
        flex={0}
        paddingVertical={'ExtraSmall'}
        paddingHorizontal={'ExtraSmall'}
      >
        <Button
          title={`Previous ${range}`}
          onPress={() => setFrom(current => new Date(current.getTime() - rangeMs[range]))}
        />
        <Button
          title="Today"
          onPress={() => setFrom(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))}
          isDisabled={isSameDay(from, new Date())}
        />
        <Button
          title={`Next ${range}`}
          onPress={() => setFrom(current => new Date(current.getTime() + rangeMs[range]))}
        />
      </ResponsiveGrid>
    </>
  );
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
