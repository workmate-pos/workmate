import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useEffect, useState } from 'react';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { useEmployeeAvailabilityMutation } from '@work-orders/common/queries/use-employee-availability-mutation.js';
import { useEmployeeAvailabilitiesQuery } from '@work-orders/common/queries/use-employee-availabilities-query.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Loading } from '@shopify/app-bridge-react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { keepPreviousData } from '@tanstack/react-query';
import { useDeleteEmployeeAvailabilityMutation } from '@work-orders/common/queries/use-delete-employee-availability-mutation.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import { EmployeeAvailability } from '@web/services/schedules/queries.js';
import { EventApi } from '@fullcalendar/core';
import { Checkbox, FormLayout, Modal, Text, TextField } from '@shopify/polaris';
import { useEmployeeAvailabilityQuery } from '@work-orders/common/queries/use-employee-availability-query.js';
import { DateTimeField } from '@web/frontend/components/form/DateTimeField.js';

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

  // negative id = optimistic update. it cannot be edited yet because we dont know its id yet
  const isAvailabilityEditable = (availability: EmployeeAvailability) =>
    availability.start.getTime() > new Date().getTime() && availability.id >= 0;

  const isEventEditable = (event: EventApi) => {
    const availability = employeeAvailabilities?.find(availability => availability.id.toString() === event.id);
    return !!availability && isAvailabilityEditable(availability);
  };

  const [shouldShowDeleteAvailabilityModal, setShouldShowDeleteAvailabilityModal] = useState(false);
  const [shouldShowEditAvailabilityModal, setShouldShowEditAvailabilityModal] = useState(false);

  const [availabilityIdToEdit, setAvailabilityIdToEdit] = useState<number>();

  return (
    <>
      {(currentEmployeeQuery.isLoading ||
        employeeAvailabilitiesQuery.isFetching ||
        employeeAvailabilityMutation.isPending ||
        deleteEmployeeAvailabilityMutation.isPending) && <Loading />}

      <FullCalendar
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
            jsEvent.preventDefault();

            const editable = isEventEditable(element.event);

            if (!editable) {
              return;
            }

            setAvailabilityIdToEdit(current => current ?? Number(element.event.id));
            setShouldShowDeleteAvailabilityModal(true);
          });
        }}
        eventContent={content => {
          const description = String(content.event.extendedProps.description ?? '');

          let html = `
            <div class="fc-event-title">${content.event.title}</div>
            <div class="fc-event-description">${description}</div>`;

          return { html };
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
              overlap: false,
              extendedProps: { description: availability.description },
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

          employeeAvailabilityMutation.mutate(
            {
              id: null,
              available: true,
              start,
              end,
              staffMemberId,
              description: '',
            },
            {
              onSuccess(availability) {
                setAvailabilityIdToEdit(current => current ?? availability.id);
                setShouldShowEditAvailabilityModal(true);
              },
            },
          );
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

          setAvailabilityIdToEdit(current => current ?? Number(event.id));
          setShouldShowEditAvailabilityModal(true);
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
            description: availability.description,
          });
        }}
        eventAllow={({ start }) => start && start.getTime() > new Date().getTime()}
      />

      <DeleteEmployeeAvailabilityModal
        open={shouldShowDeleteAvailabilityModal}
        onClose={() => {
          setAvailabilityIdToEdit(undefined);
          setShouldShowDeleteAvailabilityModal(false);
        }}
        availabilityId={availabilityIdToEdit}
      />

      <EditEmployeeAvailabilityModal
        open={shouldShowEditAvailabilityModal}
        onClose={() => {
          setAvailabilityIdToEdit(undefined);
          setShouldShowEditAvailabilityModal(false);
        }}
        availabilityId={availabilityIdToEdit}
      />

      {toast}
    </>
  );
}

function DeleteEmployeeAvailabilityModal({
  open,
  onClose,
  availabilityId,
}: {
  open: boolean;
  onClose: () => void;
  availabilityId: number | undefined;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const deleteAvailabilityMutation = useDeleteEmployeeAvailabilityMutation({ fetch });

  return (
    <>
      <Modal
        open={open}
        title={'Delete Availability'}
        onClose={onClose}
        primaryAction={{
          content: 'Delete',
          disabled: !availabilityId,
          destructive: true,
          onAction: () => {
            if (!availabilityId) {
              return;
            }

            deleteAvailabilityMutation.mutate({ id: availabilityId });
            onClose();
          },
        }}
      >
        <Modal.Section>
          <Text as="p" variant="bodyMd">
            Are you sure you want to delete this availability?
          </Text>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}

function EditEmployeeAvailabilityModal({
  open,
  onClose,
  availabilityId,
}: {
  open: boolean;
  onClose: () => void;
  availabilityId: number | undefined;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const availabilityQuery = useEmployeeAvailabilityQuery({ fetch, id: availabilityId ?? null }, { enabled: open });
  const availabilityMutation = useEmployeeAvailabilityMutation({ fetch });

  const [description, setDescription] = useState('');
  const [staffMemberId, setStaffMemberId] = useState<ID>();
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (availabilityQuery.data) {
      setDescription(availabilityQuery.data.description);
      setStaffMemberId(availabilityQuery.data.staffMemberId);
      setStart(availabilityQuery.data.start);
      setEnd(availabilityQuery.data.end);
      setAvailable(availabilityQuery.data.available);
    }
  }, [availabilityQuery.data]);

  return (
    <>
      <Modal
        open={open}
        title={'Edit Availability'}
        onClose={onClose}
        primaryAction={{
          content: 'Save',
          disabled: !availabilityId || !staffMemberId,
          onAction: () => {
            if (!availabilityId || !staffMemberId) {
              return;
            }

            availabilityMutation.mutate({
              id: availabilityId,
              staffMemberId,
              description,
              available,
              start,
              end,
            });
            onClose();
          },
        }}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label={'Description'}
              autoComplete="off"
              value={description}
              multiline
              onChange={setDescription}
            />
            <DateTimeField label="Start" value={start} onChange={start => setStart(start)} requiredIndicator />
            <DateTimeField label="End" value={end} onChange={end => setEnd(end)} requiredIndicator />
            <Checkbox label={'Available'} checked={available} onChange={available => setAvailable(available)} />
          </FormLayout>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
