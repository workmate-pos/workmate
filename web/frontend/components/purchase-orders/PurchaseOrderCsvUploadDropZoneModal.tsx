import { useState } from 'react';
import { BlockStack, DropZone, Icon, InlineGrid, InlineStack, Modal, Text } from '@shopify/polaris';
import { FileMinor } from '@shopify/polaris-icons';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { usePurchaseOrdersUploadCsvMutation } from '@work-orders/common/queries/use-purchase-orders-upload-csv-mutation.js';

export function PurchaseOrderCsvUploadDropZoneModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const purchaseOrdersUploadCsvMutation = usePurchaseOrdersUploadCsvMutation({ fetch });

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
  ] as const;

  return (
    <>
      <Modal
        open={open}
        title={'Import Purchase Orders'}
        onClose={onClose}
        primaryAction={{
          content: 'Import',
          loading: purchaseOrdersUploadCsvMutation.isLoading,
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
            <InlineGrid gap={'200'} columns={5} alignItems="end">
              {files.map(({ name, file, setFile }) => (
                <DropZone
                  key={name}
                  label={name}
                  active={!file}
                  type="file"
                  allowMultiple={false}
                  onDropAccepted={([file]) => setFile(file)}
                  onDropRejected={() => setToastAction({ content: 'Invalid file type' })}
                  accept="text/csv"
                >
                  {!file && <DropZone.FileUpload actionTitle="Upload" />}
                  {file && (
                    <BlockStack align="center" inlineAlign="center">
                      <Icon source={FileMinor} tone="base" />
                      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                        {file.name}
                      </Text>
                    </BlockStack>
                  )}
                </DropZone>
              ))}
            </InlineGrid>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
