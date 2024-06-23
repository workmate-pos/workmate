import { CreateWorkOrderDispatchProxy, WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { BlockStack, Card, Text, TextField } from '@shopify/polaris';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useOrderQuery } from '@work-orders/common/queries/use-order-query.js';
import { DateTime } from '@web/schemas/generated/create-work-order.js';
import { useState } from 'react';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';
import { DateModal } from '@web/frontend/components/shared-orders/modals/DateModal.js';

export function WorkOrderGeneralCard({
  createWorkOrder,
  dispatch,
  disabled,
  onCustomerSelectorClick,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  dispatch: CreateWorkOrderDispatchProxy;
  disabled: boolean;
  onCustomerSelectorClick: () => void;
}) {
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const customerQuery = useCustomerQuery({ fetch, id: createWorkOrder.customerId });
  const derivedFromOrderQuery = useOrderQuery({ fetch, id: createWorkOrder.derivedFromOrderId });
  const derivedFromOrder = derivedFromOrderQuery.data?.order;

  const dueDateUtc = new Date(createWorkOrder.dueDate);
  const dueDateLocal = new Date(dueDateUtc.getTime() - dueDateUtc.getTimezoneOffset() * MINUTE_IN_MS);

  return (
    <>
      <Card>
        <BlockStack gap={'400'}>
          <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
            General
          </Text>

          {createWorkOrder.derivedFromOrderId && (
            <TextField
              label={'Previous Order'}
              autoComplete={'off'}
              requiredIndicator
              value={
                createWorkOrder.derivedFromOrderId && !derivedFromOrderQuery.isLoading
                  ? derivedFromOrder?.name ?? 'Unknown Order'
                  : ''
              }
              loading={!!createWorkOrder.derivedFromOrderId && derivedFromOrderQuery.isLoading}
              disabled={disabled}
              readOnly
            />
          )}

          {createWorkOrder.derivedFromOrderId && (
            <TextField
              label={'Previous Order'}
              autoComplete={'off'}
              requiredIndicator
              value={derivedFromOrder?.workOrders.map(workOrder => workOrder.name).join(' • ') ?? ''}
              loading={!!createWorkOrder.derivedFromOrderId && derivedFromOrderQuery.isLoading}
              disabled={disabled}
              readOnly
            />
          )}

          <TextField
            label={'Customer'}
            autoComplete={'off'}
            requiredIndicator
            value={
              createWorkOrder.customerId && !customerQuery.isLoading
                ? customerQuery.data?.displayName ?? 'Unknown Customer'
                : ''
            }
            loading={!!createWorkOrder.customerId && customerQuery.isLoading}
            onFocus={() => onCustomerSelectorClick()}
            disabled={disabled}
            readOnly
          />

          <TextField
            label={'Note'}
            autoComplete={'off'}
            value={createWorkOrder.note ?? ''}
            multiline={2}
            onChange={note => dispatch.setPartial({ note })}
            disabled={disabled}
          />

          <TextField
            label={'Hidden Note'}
            autoComplete={'off'}
            value={createWorkOrder.internalNote ?? ''}
            multiline={2}
            onChange={internalNote => dispatch.setPartial({ internalNote })}
            disabled={disabled}
          />

          <TextField
            label={'Due Date'}
            autoComplete={'off'}
            value={dueDateLocal.toLocaleDateString()}
            disabled={disabled}
            readOnly
            onFocus={() => setIsDateModalOpen(true)}
          />
        </BlockStack>
      </Card>

      {isDateModalOpen && (
        <DateModal
          open={isDateModalOpen}
          onClose={() => setIsDateModalOpen(false)}
          onUpdate={dueDate => dispatch.setPartial({ dueDate: dueDate.toISOString() as DateTime })}
          initialDate={dueDateUtc}
          timezone={false}
        />
      )}

      {toast}
    </>
  );
}
