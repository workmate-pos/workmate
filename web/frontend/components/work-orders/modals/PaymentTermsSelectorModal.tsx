import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { WorkOrderPaymentTerms } from '@web/services/work-orders/types.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { Box, Modal, Select, Spinner, Tabs, Text, TextField } from '@shopify/polaris';
import {
  usePaymentTermsTemplatesQueries,
  usePaymentTermsTemplatesQuery,
} from '@work-orders/common/queries/use-payment-terms-templates-query.js';
import { isPaymentTermType, paymentTermTypes } from '@work-orders/common/util/payment-terms-types.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useState } from 'react';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { DAY_IN_MS } from '@work-orders/common/time/constants.js';
import { DateTime } from '@web/schemas/generated/create-work-order.js';
import { sentenceCase, titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { DateModal } from '@web/frontend/components/shared-orders/modals/DateModal.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export function PaymentTermsSelectorModal({
  open,
  onClose,
  onSelect,
  setToastAction,
  initialPaymentTerms,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (paymentTerms: WorkOrderPaymentTerms | null) => void;
  setToastAction: ToastActionCallable;
  initialPaymentTerms: WorkOrderPaymentTerms | null;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const paymentTermsTemplatesQueries = usePaymentTermsTemplatesQueries({ fetch, types: [...paymentTermTypes] });
  const errorQuery = Object.values(paymentTermsTemplatesQueries).find(query => query.isError);

  const [paymentTerms, setPaymentTerms] = useState(initialPaymentTerms);

  const onPaymentTermsTypeTransition = (type: string) => {
    if (type === 'NONE') {
      setPaymentTerms(null);
      return;
    }

    if (!isPaymentTermType(type)) {
      setToastAction({ content: `Invalid payment term type '${type}'` });
      return;
    }

    const templateId = paymentTermsTemplatesQueries[type]?.data?.find(hasPropertyValue('paymentTermsType', type))?.id;

    if (!templateId) {
      setToastAction({ content: `No template found for '${type}'` });
      return;
    }

    if (type === 'FIXED') {
      const date = new Date(Date.now() + 7 * DAY_IN_MS);
      setPaymentTerms({ templateId, date: date.toISOString() as DateTime });
      return;
    }

    setPaymentTerms({ templateId, date: null });
  };

  const templates = Object.values(paymentTermsTemplatesQueries)
    .flatMap(query => query.data)
    .filter(isNonNullable);

  const currentTemplate = paymentTerms ? templates.find(hasPropertyValue('id', paymentTerms.templateId)) : null;

  const getTabContents = () => {
    if (paymentTerms === null) {
      return <EmptyPaymentTerms type={'NONE'} />;
    }

    if (!currentTemplate) {
      return <UnknownPaymentTerms />;
    }

    if (currentTemplate.paymentTermsType === 'FIXED') {
      return (
        <FixedPaymentTerms
          paymentTerms={paymentTerms}
          setPaymentTerms={setPaymentTerms}
          setToastAction={setToastAction}
        />
      );
    }

    if (currentTemplate.paymentTermsType === 'NET') {
      return (
        <NetPaymentTerms
          paymentTerms={paymentTerms}
          setPaymentTerms={setPaymentTerms}
          setToastAction={setToastAction}
        />
      );
    }

    return <EmptyPaymentTerms type={currentTemplate.paymentTermsType} />;
  };

  const tabNames = ['NONE', ...paymentTermTypes];

  return (
    <Modal
      open={open}
      title={'Select payment terms'}
      onClose={onClose}
      primaryAction={{
        content: 'Save',
        onAction: () => {
          onSelect(paymentTerms);
          onClose();
        },
      }}
    >
      <Modal.Section>
        {errorQuery?.isError && (
          <Text as={'p'} variant={'bodyLg'} fontWeight={'bold'} tone={'critical'}>
            {extractErrorMessage(errorQuery.error, 'An error occurred while loading payment terms templates')}
          </Text>
        )}

        <Tabs
          tabs={tabNames.map(type => ({
            id: type,
            selected: type === currentTemplate?.paymentTermsType,
            content: sentenceCase(type),
            onAction: () => onPaymentTermsTypeTransition(type),
          }))}
          selected={tabNames.findIndex(type => type === (currentTemplate?.paymentTermsType ?? 'NONE'))}
        >
          <Box paddingBlock={'400'} paddingInline={'400'}>
            {getTabContents()}
          </Box>
        </Tabs>
      </Modal.Section>
    </Modal>
  );
}

function EmptyPaymentTerms({ type }: { type: string }) {
  return (
    <Text as={'p'} tone="subdued">
      Selected {sentenceCase(type)}
    </Text>
  );
}

function UnknownPaymentTerms() {
  return (
    <Text as={'p'} tone="subdued">
      Selected an unknown payment terms template
    </Text>
  );
}

function FixedPaymentTerms({
  paymentTerms,
  setPaymentTerms,
  setToastAction,
}: {
  paymentTerms: WorkOrderPaymentTerms;
  setPaymentTerms: (paymentTerms: WorkOrderPaymentTerms) => void;
  setToastAction: ToastActionCallable;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const paymentTermsTemplatesQuery = usePaymentTermsTemplatesQuery({ fetch, type: 'FIXED' });

  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  if (paymentTermsTemplatesQuery.isLoading) {
    return <Spinner />;
  }

  if (paymentTermsTemplatesQuery.isError) {
    return (
      <Text as={'p'} tone={'critical'}>
        {extractErrorMessage(
          paymentTermsTemplatesQuery.error,
          'An error occurred while loading fixed payment templates',
        )}
      </Text>
    );
  }

  if (!paymentTermsTemplatesQuery.data) {
    return null;
  }

  const [template] = paymentTermsTemplatesQuery.data;

  if (!template) {
    return (
      <Text as={'p'} tone={'critical'}>
        Selected an unknown payment terms template
      </Text>
    );
  }

  const value = paymentTerms.date ? new Date(paymentTerms.date).toLocaleDateString() : 'No date set';

  return (
    <>
      <TextField
        label="Payment Due On"
        value={value}
        autoComplete="off"
        readOnly
        onFocus={() => setIsDateModalOpen(true)}
      />

      {isDateModalOpen && (
        <DateModal
          open={isDateModalOpen}
          onClose={() => setIsDateModalOpen(false)}
          onUpdate={date => setPaymentTerms({ templateId: template.id, date: date.toISOString() as DateTime })}
        />
      )}
    </>
  );
}

function NetPaymentTerms({
  paymentTerms,
  setPaymentTerms,
  setToastAction,
}: {
  paymentTerms: WorkOrderPaymentTerms;
  setPaymentTerms: (paymentTerms: WorkOrderPaymentTerms) => void;
  setToastAction: ToastActionCallable;
}) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const paymentTermsTemplatesQuery = usePaymentTermsTemplatesQuery({ fetch, type: 'NET' });

  if (paymentTermsTemplatesQuery.isLoading) {
    return <Spinner />;
  }

  if (paymentTermsTemplatesQuery.isError) {
    return (
      <Text as={'p'} tone={'critical'}>
        {extractErrorMessage(paymentTermsTemplatesQuery.error, 'An error occurred while loading net payment templates')}
      </Text>
    );
  }

  if (!paymentTermsTemplatesQuery.data) {
    return null;
  }

  const templates = paymentTermsTemplatesQuery.data;
  const currentTemplate = templates.find(hasPropertyValue('id', paymentTerms.templateId));

  return (
    <Select
      label="Payment terms"
      value={currentTemplate?.id}
      options={templates.map(template => ({
        label: template.name,
        value: template.id,
      }))}
      onChange={id => setPaymentTerms({ templateId: id as ID, date: null })}
    />
  );
}
