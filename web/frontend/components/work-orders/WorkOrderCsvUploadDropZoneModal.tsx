import { useState } from 'react';
import { BlockStack, Modal, Text } from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useWorkOrdersUploadCsvMutation } from '@work-orders/common/queries/use-work-orders-upload-csv-mutation.js';
import { CsvDropZones } from '@web/frontend/components/csv/CsvDropZones.js';

export function WorkOrderCsvUploadDropZoneModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const workOrdersUploadCsvMutation = useWorkOrdersUploadCsvMutation(
    { fetch },
    {
      onSuccess() {
        setToastAction({ content: 'Imported work orders!' });
        onClose();
      },
    },
  );

  const [workOrderInfoFile, setWorkOrderInfoFile] = useState<File>();
  const [lineItemsFile, setLineItemsFile] = useState<File>();
  const [customFieldsFile, setCustomFieldsFile] = useState<File>();
  const [chargesFile, setChargesFile] = useState<File>();
  const [lineItemCustomFieldsFile, setLineItemCustomFieldsFile] = useState<File>();

  const files = [
    { name: 'work-order-info.csv', file: workOrderInfoFile, setFile: setWorkOrderInfoFile },
    { name: 'work-order-line-items.csv', file: lineItemsFile, setFile: setLineItemsFile },
    { name: 'work-order-custom-fields.csv', file: customFieldsFile, setFile: setCustomFieldsFile },
    { name: 'work-order-charges.csv', file: chargesFile, setFile: setChargesFile },
    {
      name: 'work-order-line-item-custom-fields.csv',
      file: lineItemCustomFieldsFile,
      setFile: setLineItemCustomFieldsFile,
    },
  ];

  return (
    <>
      <Modal
        open={open}
        title={'Import work orders'}
        onClose={onClose}
        primaryAction={{
          content: 'Import',
          loading: workOrdersUploadCsvMutation.isPending,
          disabled: !workOrderInfoFile,
          onAction: () => {
            if (!workOrderInfoFile) {
              setToastAction({ content: 'work-order-info.csv is required' });
              return;
            }

            workOrdersUploadCsvMutation.mutate({
              'work-order-custom-fields.csv': customFieldsFile,
              'work-order-info.csv': workOrderInfoFile,
              'work-order-charges.csv': chargesFile,
              'work-order-line-item-custom-fields.csv': lineItemCustomFieldsFile,
              'work-order-line-items.csv': lineItemsFile,
            });
          },
        }}
      >
        <Modal.Section>
          <BlockStack gap={'200'}>
            <Text as="p" variant={'bodyMd'}>
              Import work orders from CSV files. Line items and custom fields can optionally be included by uploading
              additional CSV files.
            </Text>
            <Text as="p" variant={'bodyMd'} fontWeight={'bold'}>
              You can download CSV templates{' '}
              <a href="/api/work-order/upload/csv/templates" download>
                here
              </a>
            </Text>
            <CsvDropZones files={files} columns={5} />
          </BlockStack>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
