import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useReorderPointsUploadCsvMutation } from '@work-orders/common/queries/use-reorder-points-upload-csv-mutation.js';
import { useState } from 'react';
import { BlockStack, Modal, Text } from '@shopify/polaris';
import { CsvDropZones } from '@web/frontend/components/csv/CsvDropZones.js';

export function ReorderPointCsvUploadDropZoneModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const reorderPointsUploadCsvMutation = useReorderPointsUploadCsvMutation(
    { fetch },
    {
      onSuccess: () => {
        setToastAction({ content: 'Reorder points uploaded' });
        onClose();
      },
    },
  );

  const [reorderPointsFile, setReorderPointsFile] = useState<File>();

  const files = [{ name: 'reorder-points.csv', file: reorderPointsFile, setFile: setReorderPointsFile }];

  return (
    <>
      <Modal
        open={open}
        title={'Import re-order points'}
        onClose={onClose}
        primaryAction={{
          content: 'Import',
          loading: reorderPointsUploadCsvMutation.isPending,
          disabled: !reorderPointsFile,
          onAction: () => {
            if (!reorderPointsFile) {
              setToastAction({ content: 'reorder-points.csv is required' });
              return;
            }

            reorderPointsUploadCsvMutation.mutate({ 'reorder-points.csv': reorderPointsFile });
          },
        }}
      >
        <Modal.Section>
          <BlockStack gap={'200'}>
            <Text as="p" variant={'bodyMd'}>
              Import re-order points from a CSV file.
            </Text>
            <Text as="p" variant={'bodyMd'} fontWeight={'bold'}>
              You can download CSV templates{' '}
              <a href="/api/purchase-orders/reorder/upload/csv/templates" download>
                here
              </a>
            </Text>
            <CsvDropZones files={files} />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
