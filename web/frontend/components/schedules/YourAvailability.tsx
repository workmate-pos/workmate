import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useRef, useState } from 'react';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { useEmployeeAvailabilityMutation } from '@work-orders/common/queries/use-employee-availability-mutation.js';
import { useEmployeeAvailabilitiesQuery } from '@work-orders/common/queries/use-employee-availabilities-query.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Loading } from '@shopify/app-bridge-react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { keepPreviousData } from '@tanstack/react-query';
import { BlockStack, Icon, InlineStack, Text } from '@shopify/polaris';
import { DeleteMajor } from '@shopify/polaris-icons';
import { useDeleteEmployeeAvailabilityMutation } from '@work-orders/common/queries/use-delete-employee-availability-mutation.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import { EmployeeAvailability } from '@web/services/schedules/queries.js';
import { EventApi } from '@fullcalendar/core';

export const AVAILABLE_COLOR = '#20c020';
export const UNAVAILABLE_COLOR = '#f04040';

export function YourAvailability() {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [from, setFrom] = useState<Date>(new Date());
  const [to, setTo] = useState<Date>(new Date());

  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });
  const currentEmployee = currentEmployeeQuery.data;

  const employeeAvailabilitiesQuery = useEmployeeAvailabilitiesQuery(
    {
      fetch,
      filters: { from, to, staffMemberId: currentEmployee?.staffMemberId ?? createGid('StaffMember', '0') },
    },
    {
      // handy when moving from day to week/vice versa. would flash otherwise
      placeholderData: keepPreviousData,
    },
  );
  const employeeAvailabilities = employeeAvailabilitiesQuery.data;

  const employeeAvailabilityMutation = useEmployeeAvailabilityMutation({ fetch });
  const deleteEmployeeAvailabilityMutation = useDeleteEmployeeAvailabilityMutation({ fetch });

  const calendarRef = useRef<FullCalendar>(null);
  const trashCanRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);

  // negative id = optimistic update. it cannot be edited yet because we dont know its id yet
  const isAvailabilityEditable = (availability: EmployeeAvailability) =>
    availability.start.getTime() > new Date().getTime() && availability.id >= 0;

  const isEventEditable = (event: EventApi) => {
    const availability = employeeAvailabilities?.find(availability => availability.id.toString() === event.id);
    return !!availability && isAvailabilityEditable(availability);
  };

  return (
    <>
      {(currentEmployeeQuery.isLoading ||
        employeeAvailabilitiesQuery.isFetching ||
        employeeAvailabilityMutation.isPending ||
        deleteEmployeeAvailabilityMutation.isPending) && <Loading />}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        footerToolbar={{
          right: 'today prev,next',
        }}
        eventDidMount={element => {
          element.el.addEventListener('contextmenu', jsEvent => {
            const editable = isEventEditable(element.event);

            if (!editable) {
              return;
            }

            jsEvent.preventDefault();
            deleteEmployeeAvailabilityMutation.mutate({ id: Number(element.event.id) });
          });
        }}
        eventDragStart={() => setIsDragging(true)}
        eventDragStop={({ jsEvent, event }) => {
          setIsDragging(false);

          const editable = isEventEditable(event);

          if (!editable || !trashCanRef.current) {
            return;
          }

          const { left, right, bottom, top } = trashCanRef.current.getBoundingClientRect();
          if (
            jsEvent.clientX >= left &&
            jsEvent.clientX <= right &&
            jsEvent.clientY >= top &&
            jsEvent.clientY <= bottom
          ) {
            deleteEmployeeAvailabilityMutation.mutate({ id: Number(event.id) });
          }
        }}
        nowIndicator
        datesSet={({ start, end }) => {
          setFrom(start);
          setTo(end);
        }}
        events={
          employeeAvailabilities?.map(availability => {
            // negative id = optimistic update. it cannot be edited yet because we dont know its id yet
            const editable = isAvailabilityEditable(availability);
            const color = availability.available ? AVAILABLE_COLOR : UNAVAILABLE_COLOR;
            const colorOpacity = editable ? 'ff' : '77';

            return {
              id: availability.id.toString(),
              title: availability.available ? 'Available' : 'Unavailable',
              start: availability.start,
              end: availability.end,
              color: `${color.slice(0, 7)}${colorOpacity}`,
              editable,
            };
          }) ?? []
        }
        selectable
        select={({ start, end }) => {
          if (start.getTime() < new Date().getTime()) {
            return;
          }

          const staffMemberId = currentEmployee?.staffMemberId;

          if (!staffMemberId) {
            setToastAction({ content: 'Loading staff member ID, please try again in a second' });
            return;
          }

          employeeAvailabilityMutation.mutate({
            id: null,
            available: true,
            start,
            end,
            staffMemberId,
          });
        }}
        editable
        droppable
        eventResizableFromStart
        eventStartEditable
        eventDurationEditable
        eventClick={({ event }) => {
          const editable = isEventEditable(event);

          if (!editable) {
            return;
          }

          const availability = employeeAvailabilitiesQuery.data?.find(
            availability => availability.id.toString() === event.id,
          );

          if (!availability) {
            return;
          }

          employeeAvailabilityMutation.mutate({
            id: availability.id,
            available: !availability.available,
            start: availability.start,
            end: availability.end,
            staffMemberId: availability.staffMemberId,
          });
        }}
        eventChange={({ event }) => {
          const availability = employeeAvailabilitiesQuery.data?.find(
            availability => availability.id.toString() === event.id,
          );

          if (!availability) {
            return;
          }

          employeeAvailabilityMutation.mutate({
            id: availability.id,
            available: availability.available,
            start: event.start ?? availability.start,
            end: event.end ?? availability.end,
            staffMemberId: availability.staffMemberId,
          });
        }}
        eventAllow={({ start }) => start && start.getTime() > new Date().getTime()}
      />

      <div ref={trashCanRef}>
        <InlineStack align="center">
          <div
            style={{
              backgroundColor: 'rgba(255, 0, 0, 0.075)',
              filter: !isDragging ? 'grayscale(1)' : 'none',
              opacity: !isDragging ? '0.5' : '1',
              padding: '4em 14em',
              overflow: 'hidden',
              borderRadius: '1em',
            }}
          >
            <BlockStack gap="200">
              <Icon source={DeleteMajor} tone="critical" />
              <InlineStack gap="200">
                <Text as="p" variant="headingMd" tone="critical">
                  Drop to delete
                </Text>
              </InlineStack>
            </BlockStack>
          </div>
        </InlineStack>
      </div>

      {toast}
    </>
  );
}
