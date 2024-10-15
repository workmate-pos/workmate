import { DateTime, WorkOrderPaymentTerms } from '@web/schemas/generated/create-work-order.js';
import {
  DateField,
  RadioButtonList,
  ScrollView,
  SegmentedControl,
  Stack,
  Text,
  useApi,
} from '@shopify/ui-extensions-react/point-of-sale';
import { Dispatch, SetStateAction, useState } from 'react';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { DAY_IN_MS } from '@work-orders/common/time/constants.js';
import { useRouter } from '../../routes.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import {
  usePaymentTermsTemplatesQueries,
  usePaymentTermsTemplatesQuery,
} from '@work-orders/common/queries/use-payment-terms-templates-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { isPaymentTermType, paymentTermTypes } from '@work-orders/common/util/payment-terms-types.js';

export function PaymentTermsSelector({
  companyLocationId,
  initialPaymentTerms,
  onSelect,
  disabled,
}: {
  companyLocationId: ID | null;
  initialPaymentTerms: WorkOrderPaymentTerms | null;
  onSelect: (paymentTerms: WorkOrderPaymentTerms | null) => void;
  disabled: boolean;
}) {
  const { toast } = useApi<'pos.home.modal.render'>();
  const fetch = useAuthenticatedFetch();

  const paymentTermsTemplatesQueries = usePaymentTermsTemplatesQueries({ fetch, types: [...paymentTermTypes] });

  const screen = useScreen();
  screen.setIsLoading(Object.values(paymentTermsTemplatesQueries).some(query => query.isLoading));

  const errorQuery = Object.values(paymentTermsTemplatesQueries).find(query => query.isError);

  if (errorQuery) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(errorQuery.error, 'An error occurred while loading payment templates')}
        </Text>
      </Stack>
    );
  }

  // TODO: Reset button
  // const companyLocationQuery = useCompanyLocationQuery({ fetch, id: companyLocationId });
  // const companyLocation = companyLocationQuery.data;

  const [paymentTerms, setPaymentTerms] = useState(initialPaymentTerms);

  const router = useRouter();

  const onPaymentTermsTypeTransition = (type: string) => {
    if (type === 'NONE') {
      setPaymentTerms(null);
      return;
    }

    if (!isPaymentTermType(type)) {
      toast.show(`Invalid payment term type '${type}'`);
      return;
    }

    const templateId = paymentTermsTemplatesQueries[type]?.data?.find(hasPropertyValue('paymentTermsType', type))?.id;

    if (!templateId) {
      toast.show(`No template found for '${type}'`);
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

  const getSegmentContents = () => {
    if (paymentTerms === null) {
      return <EmptyPaymentTerms type={'NONE'} />;
    }

    if (!currentTemplate) {
      return <UnknownPaymentTerms />;
    }

    if (currentTemplate.paymentTermsType === 'FIXED') {
      return <FixedPaymentTerms paymentTerms={paymentTerms} setPaymentTerms={setPaymentTerms} disabled={disabled} />;
    }

    if (currentTemplate.paymentTermsType === 'NET') {
      return <NetPaymentTerms paymentTerms={paymentTerms} setPaymentTerms={setPaymentTerms} disabled={disabled} />;
    }

    return <EmptyPaymentTerms type={currentTemplate.paymentTermsType} />;
  };

  return (
    <ScrollView>
      <SegmentedControl
        onSelect={onPaymentTermsTypeTransition}
        selected={currentTemplate?.paymentTermsType ?? 'N/A'}
        segments={['NONE', ...paymentTermTypes].map(type => ({
          id: type,
          label: titleCase(type),
          disabled: disabled,
        }))}
      />

      <Form disabled={disabled || !router.isCurrent}>
        <Stack direction={'vertical'} paddingVertical={'ExtraLarge'} alignment={'center'}>
          {getSegmentContents()}
        </Stack>

        <FormButton
          type={'primary'}
          title={'Save'}
          action={'submit'}
          onPress={() => {
            onSelect(paymentTerms);
            router.popCurrent();
          }}
        />
      </Form>
    </ScrollView>
  );
}

function EmptyPaymentTerms({ type }: { type: string }) {
  return (
    <Text variant={'body'} color={'TextSubdued'}>
      Selected {titleCase(type)}
    </Text>
  );
}

function UnknownPaymentTerms() {
  return (
    <Text variant={'body'} color={'TextSubdued'}>
      Selected an unknown payment terms template
    </Text>
  );
}

function FixedPaymentTerms({
  paymentTerms,
  setPaymentTerms,
  disabled,
}: {
  paymentTerms: WorkOrderPaymentTerms;
  setPaymentTerms: Dispatch<SetStateAction<WorkOrderPaymentTerms | null>>;
  disabled: boolean;
}) {
  const fetch = useAuthenticatedFetch();
  const paymentTermsTemplatesQuery = usePaymentTermsTemplatesQuery({ fetch, type: 'FIXED' });

  if (paymentTermsTemplatesQuery.isLoading) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text variant="body" color="TextSubdued">
          Loading...
        </Text>
      </Stack>
    );
  }

  if (paymentTermsTemplatesQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(
            paymentTermsTemplatesQuery.error,
            'An error occurred while loading fixed payment templates',
          )}
        </Text>
      </Stack>
    );
  }

  if (!paymentTermsTemplatesQuery.data) {
    return null;
  }

  const [template] = paymentTermsTemplatesQuery.data;

  if (!template) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          No fixed payment template found
        </Text>
      </Stack>
    );
  }

  return (
    <DateField
      label={'Payment Due On'}
      value={paymentTerms.date ?? undefined}
      onChange={(date: string) =>
        setPaymentTerms({ templateId: template.id, date: new Date(date).toISOString() as DateTime })
      }
      disabled={disabled}
    />
  );
}

function NetPaymentTerms({
  paymentTerms,
  setPaymentTerms,
  disabled,
}: {
  paymentTerms: WorkOrderPaymentTerms;
  setPaymentTerms: Dispatch<SetStateAction<WorkOrderPaymentTerms | null>>;
  disabled: boolean;
}) {
  const { toast } = useApi<'pos.home.modal.render'>();
  const fetch = useAuthenticatedFetch();

  const netPaymentTermsTemplatesQuery = usePaymentTermsTemplatesQuery({ fetch, type: 'NET' });

  if (netPaymentTermsTemplatesQuery.isLoading) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text variant="body" color="TextSubdued">
          Loading...
        </Text>
      </Stack>
    );
  }

  if (netPaymentTermsTemplatesQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(
            netPaymentTermsTemplatesQuery.error,
            'An error occurred while loading net payment templates',
          )}
        </Text>
      </Stack>
    );
  }

  if (!netPaymentTermsTemplatesQuery.data) {
    return null;
  }

  const templates = netPaymentTermsTemplatesQuery.data;
  const currentTemplate = templates.find(hasPropertyValue('id', paymentTerms.templateId));

  if (disabled) {
    // RadioButtonList doesn't support disabled XD
    return <Text color={'TextSubdued'}>{currentTemplate?.name ?? 'Unknown payment terms'}</Text>;
  }

  return (
    <RadioButtonList
      items={templates.map(template => template.name)}
      onItemSelected={(templateName: string) => {
        const template = templates.find(template => template.name === templateName);

        if (!template) {
          toast.show(`Invalid template '${templateName}'`);
          return;
        }

        setPaymentTerms({ templateId: template.id, date: null });
      }}
      initialSelectedItem={currentTemplate?.name}
    />
  );
}
