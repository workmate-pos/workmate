import { FormLayout, Modal, TextField } from '@shopify/polaris';
import {
  UnsourcedItemList,
  UnsourcedWorkOrderItem,
} from '@web/frontend/components/work-orders/components/UnsourcedItemList.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { useSpecialOrderMutation } from '@work-orders/common/queries/use-special-order-mutation.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { DateTimeField } from '@web/frontend/components/form/DateTimeField.js';
import { uuid } from '@work-orders/common/util/uuid.js';
import { DateTime } from '@web/schemas/generated/create-special-order.js';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';

export function WorkOrderSourcingSpecialOrderModal({
  name,
  open,
  onClose,
}: {
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const workOrderQuery = useWorkOrderQuery({ fetch, name });
  const workOrder = workOrderQuery.data?.workOrder;

  const specialOrderMutation = useSpecialOrderMutation({ fetch });

  const [selected, setSelected] = useState<(UnsourcedWorkOrderItem & { quantity: number })[]>([]);
  const [note, setNote] = useState('');
  const [requiredBy, setRequiredBy] = useState<Date>();

  const app = useAppBridge();

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Special Order"
        loading={workOrderQuery.isLoading}
        primaryAction={{
          content: 'Create Special Order',
          loading: specialOrderMutation.isPending,
          disabled: !selected.length || !workOrder?.locationId,
          onAction: () => {
            if (!selected.length || !workOrder?.locationId) {
              return;
            }

            specialOrderMutation.mutate(
              {
                name: null,
                customerId: workOrder.customerId,
                // TODO: Make sure to get rid of currentSession.locationId everywhere
                locationId: workOrder.locationId,
                companyId: workOrder.companyId,
                companyLocationId: workOrder.companyLocationId,
                companyContactId: workOrder.companyContactId,
                note,
                requiredBy: requiredBy ? (requiredBy.toISOString() as DateTime) : null,
                lineItems: selected.map(item => ({
                  uuid: uuid(),
                  shopifyOrderLineItem: {
                    id: item.shopifyOrderLineItem.id,
                    orderId: item.shopifyOrderLineItem.orderId,
                  },
                  quantity: item.quantity,
                  productVariantId: item.productVariantId,
                })),
              },
              {
                onSuccess(specialOrder) {
                  setToastAction({ content: 'Created special order!' });
                  Redirect.create(app).dispatch(
                    Redirect.Action.APP,
                    `/special-orders/${encodeURIComponent(specialOrder.name)}`,
                  );
                  onClose();
                },
              },
            );
          },
        }}
      >
        <UnsourcedItemList name={name} includeAvailable={false} max="none" onSelectionChange={setSelected} />

        <Modal.Section>
          <FormLayout>
            <TextField label={'Note'} autoComplete="off" multiline value={note} onChange={setNote} />

            <DateTimeField
              label="Required By"
              value={requiredBy}
              onChange={setRequiredBy}
              labelAction={requiredBy ? { content: 'Clear', onAction: () => setRequiredBy(undefined) } : undefined}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
