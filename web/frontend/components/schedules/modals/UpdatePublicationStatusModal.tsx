import { EmployeeSchedule } from '@web/services/schedules/queries.js';
import { useEffect, useState } from 'react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { FormLayout, Modal, Select } from '@shopify/polaris';
import { DateTime } from '@web/schemas/generated/bulk-upsert-schedules.js';
import { DateTimeField } from '@web/frontend/components/form/DateTimeField.js';
import { useBulkEmployeeScheduleMutation } from '@work-orders/common/queries/use-bulk-employee-schedule-mutation.js';

export function UpdatePublicationStatusModal({
  open,
  onClose,
  schedules,
}: {
  open: boolean;
  onClose: () => void;
  schedules: EmployeeSchedule[];
}) {
  const [publicationStatus, setPublicationStatus] = useState<string>();
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const bulkMutation = useBulkEmployeeScheduleMutation(
    { fetch },
    {
      onSuccess(_, { schedules }) {
        setToastAction({ content: `Saved schedule${schedules.length === 1 ? '' : 's'}` });
        onClose();
      },
    },
  );

  useEffect(() => {
    const [schedule] = schedules;

    if (schedule) {
      if (!schedule.publishedAt) {
        setPublicationStatus('draft');
      } else if (schedule.publishedAt.getTime() > new Date().getTime()) {
        setPublicationStatus('scheduled');
        setScheduledDate(new Date(schedule.publishedAt));
      } else {
        setPublicationStatus('published');
      }
    }
  }, [schedules]);

  return (
    <>
      <Modal
        open={open}
        title={'Update Publication Status'}
        onClose={onClose}
        primaryAction={{
          content: schedules.length === 1 ? 'Update schedule' : `Update ${schedules.length} schedules`,
          loading: bulkMutation.isPending,
          onAction: () => {
            let publishedAt: DateTime | null = null;

            if (publicationStatus === 'scheduled') {
              publishedAt = scheduledDate.toISOString() as DateTime;
            } else if (publicationStatus === 'published') {
              publishedAt = new Date().toISOString() as DateTime;
            }

            bulkMutation.mutate({
              schedules: schedules.map(schedule => ({
                id: schedule.id,
                schedule: {
                  name: schedule.name,
                  locationId: schedule.locationId,
                  publishedAt,
                },
              })),
            });
          },
        }}
      >
        <Modal.Section>
          <FormLayout>
            <Select
              label={'Publication Status'}
              options={[
                {
                  label: 'Draft',
                  value: 'draft',
                },
                {
                  label: 'Scheduled',
                  value: 'scheduled',
                },
                {
                  label: 'Published',
                  value: 'published',
                },
              ]}
              onChange={setPublicationStatus}
              value={publicationStatus}
              disabled={bulkMutation.isPending}
            />

            {publicationStatus === 'scheduled' && (
              <DateTimeField
                label="Publication Date & Time"
                value={scheduledDate}
                onChange={setScheduledDate}
                disabled={bulkMutation.isPending}
                min={new Date()}
              />
            )}
          </FormLayout>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
