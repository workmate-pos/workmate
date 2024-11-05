import { useState } from 'react';
import { BlockStack, Modal, Text } from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { usePurchaseOrdersUploadCsvMutation } from '@work-orders/common/queries/use-purchase-orders-upload-csv-mutation.js';
import { CsvDropZones } from '@web/frontend/components/csv/CsvDropZones.js';

export function PurchaseOrderCsvUploadDropZoneModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const purchaseOrdersUploadCsvMutation = usePurchaseOrdersUploadCsvMutation(
    { fetch },
    {
      onSuccess() {
        setToastAction({ content: 'Imported purchase orders!' });
        onClose();
      },
    },
  );

  const [purchaseOrderInfoFile, setPurchaseOrderInfoFile] = useState<File>();
  const [lineItemsFile, setLineItemsFile] = useState<File>();
  const [customFieldsFile, setCustomFieldsFile] = useState<File>();
  const [employeeAssignmentsFile, setEmployeeAssignmentsFile] = useState<File>();
  const [lineItemCustomFieldsFile, setLineItemCustomFieldsFile] = useState<File>();

  const files = [
    { name: 'purchase-order-info.csv', file: purchaseOrderInfoFile, setFile: setPurchaseOrderInfoFile },
    { name: 'line-items.csv', file: lineItemsFile, setFile: setLineItemsFile },
    { name: 'custom-fields.csv', file: customFieldsFile, setFile: setCustomFieldsFile },
    { name: 'employee-assignments.csv', file: employeeAssignmentsFile, setFile: setEmployeeAssignmentsFile },
    { name: 'line-item-custom-fields.csv', file: lineItemCustomFieldsFile, setFile: setLineItemCustomFieldsFile },
  ];

  return (
    <>
      <Modal
        open={open}
        title={'Import purchase orders'}
        onClose={onClose}
        primaryAction={{
          content: 'Import',
          loading: purchaseOrdersUploadCsvMutation.isPending,
          disabled: !purchaseOrderInfoFile,
          onAction: () => {
            if (!purchaseOrderInfoFile) {
              setToastAction({ content: 'purchase-order-info.csv is required' });
              return;
            }

            purchaseOrdersUploadCsvMutation.mutate({
              'custom-fields.csv': customFieldsFile,
              'purchase-order-info.csv': purchaseOrderInfoFile,
              'employee-assignments.csv': employeeAssignmentsFile,
              'line-item-custom-fields.csv': lineItemCustomFieldsFile,
              'line-items.csv': lineItemsFile,
            });
          },
        }}
      >
        <Modal.Section>
          <BlockStack gap={'200'}>
            <Text as="p" variant={'bodyMd'}>
              Import purchase orders from CSV files. Line items, custom fields, and employee assignments can optionally
              be included by uploading additional CSV files.
            </Text>
            <Text as="p" variant={'bodyMd'} fontWeight={'bold'}>
              You can download CSV templates{' '}
              <a href="/api/purchase-orders/upload/csv/templates" download>
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
