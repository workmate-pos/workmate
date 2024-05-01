import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { usePurchaseOrderPrintJobMutation } from '@work-orders/common/queries/use-purchase-order-print-job-mutation.js';
import { Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';

export function PrintModal({
  createPurchaseOrder,
  open,
  onClose,
  setToastAction,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });

  const settingsQuery = useSettingsQuery({ fetch });
  const printJobMutation = usePurchaseOrderPrintJobMutation({ fetch });

  const printTemplates = settingsQuery.data?.settings.purchaseOrderPrintTemplates ?? {};

  return (
    <Modal open={open} title={'Print'} onClose={onClose}>
      <ResourceList
        items={Object.entries(printTemplates)}
        resourceName={{ singular: 'print template', plural: 'print templates' }}
        resolveItemId={([name]) => name}
        renderItem={([name]) => (
          <ResourceItem
            id={name}
            onClick={() => {
              if (!createPurchaseOrder.name) {
                setToastAction({ content: 'You must save this purchase order before printing!' });
                return;
              }

              printJobMutation.mutate(
                {
                  purchaseOrderName: createPurchaseOrder.name,
                  date: new Date().toLocaleDateString(),
                  templateName: name,
                },
                {
                  onSuccess() {
                    setToastAction({ content: 'Sent print job to printer!' });
                    onClose();
                  },
                },
              );
            }}
          >
            <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
              {name}
            </Text>
          </ResourceItem>
        )}
        loading={printJobMutation.isLoading}
      />
    </Modal>
  );
}
