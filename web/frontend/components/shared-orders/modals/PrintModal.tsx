import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { usePurchaseOrderPrintJobMutation } from '@work-orders/common/queries/use-purchase-order-print-job-mutation.js';
import { Modal, ResourceItem, ResourceList, Text } from '@shopify/polaris';
import { useWorkOrderPrintJobMutation } from '@work-orders/common/queries/use-work-order-print-job-mutation.js';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';

type PrintModalProps = PrintModalPropsBase &
  (
    | {
        type: 'work-order' | 'purchase-order';
        dueDateUtc: Date;
      }
    | {
        type: 'purchase-order';
      }
  );

type PrintModalPropsBase = {
  name: string | null;
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
};

export function PrintModal({ name, open, onClose, setToastAction, ...props }: PrintModalProps) {
  const fetch = useAuthenticatedFetch({ setToastAction });

  const settingsQuery = useSettingsQuery({ fetch });
  const purchaseOrderPrintJobMutation = usePurchaseOrderPrintJobMutation({ fetch });
  const workOrderPrintJobMutation = useWorkOrderPrintJobMutation({ fetch });

  const printTemplatesKey = props.type === 'work-order' ? 'workOrderPrintTemplates' : 'purchaseOrderPrintTemplates';
  const printTemplates = settingsQuery.data?.settings[printTemplatesKey] ?? {};

  const isLoading = [
    settingsQuery.isLoading,
    purchaseOrderPrintJobMutation.isPending,
    workOrderPrintJobMutation.isPending,
  ].includes(true);

  return (
    <Modal open={open} title={'Print'} onClose={onClose}>
      <ResourceList
        items={Object.entries(printTemplates)}
        resourceName={{ singular: 'print template', plural: 'print templates' }}
        resolveItemId={([templateName]) => templateName}
        renderItem={([templateName]) => (
          <ResourceItem
            id={templateName}
            onClick={() => {
              if (!name) {
                setToastAction({ content: `You must save this ${props.type.replace('-', ' ')} before printing!` });
                return;
              }

              if (props.type === 'work-order') {
                const dueDateLocal = new Date(
                  props.dueDateUtc.getTime() + props.dueDateUtc.getTimezoneOffset() * MINUTE_IN_MS,
                );
                workOrderPrintJobMutation.mutate(
                  {
                    workOrderName: name,
                    date: new Date().toLocaleDateString(),
                    dueDate: dueDateLocal.toLocaleDateString(),
                    templateName,
                  },
                  {
                    onSuccess() {
                      setToastAction({ content: 'Sent print job to printer!' });
                      onClose();
                    },
                  },
                );
              } else if (props.type === 'purchase-order') {
                purchaseOrderPrintJobMutation.mutate(
                  {
                    purchaseOrderName: name,
                    date: new Date().toLocaleDateString(),
                    templateName,
                  },
                  {
                    onSuccess() {
                      setToastAction({ content: 'Sent print job to printer!' });
                      onClose();
                    },
                  },
                );
              } else {
                return props.type satisfies never;
              }
            }}
          >
            <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
              {templateName}
            </Text>
          </ResourceItem>
        )}
        loading={isLoading}
      />
    </Modal>
  );
}
