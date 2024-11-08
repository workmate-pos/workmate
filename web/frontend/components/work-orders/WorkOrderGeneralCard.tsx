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
import { useCompanyQuery } from '@work-orders/common/queries/use-company-query.js';
import { useCompanyLocationQuery } from '@work-orders/common/queries/use-company-location-query.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { usePaymentTermsTemplatesQueries } from '@work-orders/common/queries/use-payment-terms-templates-query.js';
import { paymentTermTypes } from '@work-orders/common/util/payment-terms-types.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { LocationSelectorModal } from '@web/frontend/components/shared-orders/modals/LocationSelectorModal.js';

export function WorkOrderGeneralCard({
  createWorkOrder,
  dispatch,
  disabled,
  onCustomerSelectorClick,
  onCompanySelectorClick,
  onCompanyLocationSelectorClick,
  onPaymentTermsSelectorClick,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  dispatch: CreateWorkOrderDispatchProxy;
  disabled: boolean;
  onCustomerSelectorClick: () => void;
  onCompanySelectorClick: () => void;
  onCompanyLocationSelectorClick: () => void;
  onPaymentTermsSelectorClick: () => void;
}) {
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const customerQuery = useCustomerQuery({ fetch, id: createWorkOrder.customerId });
  const customer = customerQuery.data;

  const derivedFromOrderQuery = useOrderQuery({ fetch, id: createWorkOrder.derivedFromOrderId });
  const derivedFromOrder = derivedFromOrderQuery.data?.order;

  const locationQuery = useLocationQuery({ fetch, id: createWorkOrder.locationId });
  const location = locationQuery.data;

  const companyQuery = useCompanyQuery(
    { fetch, id: createWorkOrder.companyId! },
    { enabled: !!createWorkOrder.companyId },
  );
  const company = companyQuery.data;

  const companyLocationQuery = useCompanyLocationQuery(
    { fetch, id: createWorkOrder.companyLocationId! },
    { enabled: !!createWorkOrder.companyLocationId },
  );
  const companyLocation = companyLocationQuery.data;

  const dueDateUtc = new Date(createWorkOrder.dueDate);
  const dueDateLocal = new Date(dueDateUtc.getTime() - dueDateUtc.getTimezoneOffset() * MINUTE_IN_MS);

  const workOrderQuery = useWorkOrderQuery({ fetch, name: createWorkOrder.name });
  const { workOrder } = workOrderQuery.data ?? {};

  const hasOrder = workOrder?.orders.some(order => order.type === 'ORDER') ?? false;

  const paymentTermsQueries = usePaymentTermsTemplatesQueries({
    fetch,
    types: [...paymentTermTypes],
  });
  const paymentTermsTemplates = Object.values(paymentTermsQueries)
    .flatMap(query => query.data)
    .filter(isNonNullable);

  const paymentTermsText = (() => {
    if (!createWorkOrder.paymentTerms) return 'No payment terms';

    const isLoading = Object.values(paymentTermsQueries).some(query => query.isLoading);
    const selectedTemplate = paymentTermsTemplates.find(
      hasPropertyValue('id', createWorkOrder.paymentTerms.templateId),
    );

    if (!selectedTemplate || isLoading) {
      return 'Loading...';
    }

    if (!selectedTemplate) {
      return 'Unknown';
    }

    if (selectedTemplate.paymentTermsType === 'FIXED') {
      return createWorkOrder.paymentTerms.date
        ? `Due ${new Date(createWorkOrder.paymentTerms.date).toLocaleDateString()}`
        : 'Due on unknown date';
    }

    return selectedTemplate.name;
  })();

  return (
    <>
      <Card>
        <BlockStack gap={'400'}>
          <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
            General
          </Text>

          {createWorkOrder.derivedFromOrderId && (
            <TextField
              label={'Previous order'}
              autoComplete={'off'}
              requiredIndicator
              value={
                createWorkOrder.derivedFromOrderId && !derivedFromOrderQuery.isLoading
                  ? (derivedFromOrder?.name ?? 'Unknown order')
                  : ''
              }
              loading={!!createWorkOrder.derivedFromOrderId && derivedFromOrderQuery.isLoading}
              disabled={disabled}
              readOnly
            />
          )}

          {createWorkOrder.derivedFromOrderId && (derivedFromOrder?.workOrders?.length ?? 0) > 0 && (
            <TextField
              label={'Previous work order'}
              autoComplete={'off'}
              requiredIndicator
              value={derivedFromOrder?.workOrders.map(workOrder => workOrder.name).join(' • ') ?? ''}
              loading={!!createWorkOrder.derivedFromOrderId && derivedFromOrderQuery.isLoading}
              disabled={disabled}
              readOnly
            />
          )}

          <TextField
            label={'Location'}
            autoComplete={'off'}
            requiredIndicator
            loading={!!createWorkOrder.locationId && locationQuery.isLoading}
            disabled={disabled || hasOrder}
            readOnly
            value={
              createWorkOrder.locationId === null
                ? ''
                : locationQuery.isLoading
                  ? 'Loading...'
                  : (location?.name ?? 'Unknown location')
            }
            onFocus={() => setIsLocationSelectorOpen(true)}
          />

          {createWorkOrder.companyId && (
            <TextField
              label={'Company'}
              autoComplete={'off'}
              requiredIndicator
              loading={!!createWorkOrder.companyId && companyQuery.isLoading}
              disabled={disabled || hasOrder}
              readOnly
              value={companyQuery.isLoading ? 'Loading...' : (company?.name ?? 'Unknown company')}
              onFocus={() => onCompanySelectorClick()}
            />
          )}

          {createWorkOrder.companyId && (
            <TextField
              label={'Location'}
              autoComplete={'off'}
              requiredIndicator
              loading={!!createWorkOrder.companyLocationId && companyLocationQuery.isLoading}
              disabled={disabled || hasOrder}
              readOnly
              value={
                createWorkOrder.companyLocationId === null
                  ? ''
                  : companyLocationQuery.isLoading
                    ? 'Loading...'
                    : (companyLocation?.name ?? 'Unknown location')
              }
              onFocus={() => onCompanyLocationSelectorClick()}
            />
          )}

          {createWorkOrder.companyId && (
            <TextField
              label={'Payment terms'}
              autoComplete="off"
              requiredIndicator
              disabled={disabled || hasOrder}
              readOnly
              onFocus={() => onPaymentTermsSelectorClick()}
              value={paymentTermsText}
            />
          )}

          <TextField
            label={'Customer'}
            autoComplete={'off'}
            requiredIndicator
            value={
              createWorkOrder.customerId && !customerQuery.isLoading
                ? (customer?.displayName ?? 'Unknown customer')
                : ''
            }
            loading={!!createWorkOrder.customerId && customerQuery.isLoading}
            onFocus={() => onCustomerSelectorClick()}
            disabled={disabled || hasOrder}
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
            label={'Hidden note'}
            autoComplete={'off'}
            value={createWorkOrder.internalNote ?? ''}
            multiline={2}
            onChange={internalNote => dispatch.setPartial({ internalNote })}
            disabled={disabled}
          />

          <TextField
            label={'Due date'}
            autoComplete={'off'}
            value={dueDateLocal.toLocaleDateString()}
            disabled={disabled}
            readOnly
            onFocus={() => setIsDateModalOpen(true)}
          />
        </BlockStack>
      </Card>

      <DateModal
        open={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        onUpdate={dueDate => dispatch.setPartial({ dueDate: dueDate.toISOString() as DateTime })}
        initialDate={dueDateUtc}
        timezone={false}
      />

      <LocationSelectorModal
        open={isLocationSelectorOpen}
        onClose={() => setIsLocationSelectorOpen(false)}
        onSelect={locationId => dispatch.setPartial({ locationId })}
      />

      {toast}
    </>
  );
}
