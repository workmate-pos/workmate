import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useWorkOrderPrintJobMutation } from '@work-orders/common/queries/use-work-order-print-job-mutation.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import {
  RadioButtonList,
  ScrollView,
  SegmentedControl,
  Stack,
  Text,
  useApi,
} from '@shopify/ui-extensions-react/point-of-sale';
import { useEffect, useState } from 'react';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { useRouter } from '../../routes.js';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';

export function WorkOrderPrintOverview({ name, dueDateUtc }: { name: string; dueDateUtc: Date }) {
  const { toast } = useApi<'pos.home.modal.render'>();

  const fetch = useAuthenticatedFetch();

  const workOrderQuery = useWorkOrderQuery({ fetch, name }, { staleTime: 0 });
  const workOrder = workOrderQuery.data?.workOrder;

  const customerQuery = useCustomerQuery({ fetch, id: workOrder?.customerId ?? null });
  const customer = customerQuery.data;

  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });
  const currentEmployee = currentEmployeeQuery.data;

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;
  const printSettings = settings?.printing.locationOverrides[workOrder?.locationId ?? ''] ?? settings?.printing.global;

  const [email, setEmail] = useState('');
  const [from, setFrom] = useState('');
  const [replyTo, setReplyTo] = useState('');

  useEffect(() => {
    if (printSettings) {
      setEmail(printSettings.defaultEmail ?? '');
      setFrom(printSettings.defaultFrom);
      setReplyTo(printSettings.defaultReplyTo);
    }
  }, [printSettings]);

  const emailTabs = [
    {
      id: 'default',
      label: 'Default Email',
      content: <FormStringField label={'Email'} value={email} disabled required />,
      onClick: () => {
        setEmail(printSettings?.defaultEmail ?? '');
      },
    },
    {
      id: 'employee',
      label: 'Your Email',
      content: <FormStringField label={'Email'} value={email} disabled required />,
      disabled: !currentEmployee?.email,
      onClick: () => {
        if (!currentEmployee?.email) {
          toast.show('You do not have an email address set');
          return;
        }

        setEmail(currentEmployee.email);
      },
    },
    {
      id: 'customer',
      label: 'Customer Email',
      content: <FormStringField label={'Email'} value={email} disabled required />,
      disabled: !customer?.email,
      onClick: () => {
        if (!customer?.email) {
          toast.show('Customer does not have an email address set');
          return;
        }

        setEmail(customer.email);
      },
    },
    {
      id: 'custom',
      label: 'Custom Email',
      disabled: !printSettings?.allowCustomEmail,
      content: <FormStringField label={'Email'} value={email} onChange={setEmail} required />,
      onClick: () => {
        if (!printSettings?.allowCustomEmail) {
          toast.show('Custom email is not allowed');
        }
      },
    },
  ];

  const fromTabs = [
    {
      id: 'default',
      label: 'Default From',
      content: <FormStringField label={'From'} value={from} disabled required />,
      onClick: () => {
        setFrom(printSettings?.defaultFrom ?? '');
      },
    },
    {
      id: 'employee',
      label: 'From You',
      content: <FormStringField label={'From'} value={from} disabled required />,
      disabled: !currentEmployee?.name,
      onClick: () => {
        if (!currentEmployee?.name) {
          toast.show('You do not have a name set');
          return;
        }

        setFrom(currentEmployee.name);
      },
    },
    {
      id: 'custom',
      label: 'Custom From',
      disabled: !printSettings?.allowCustomFrom,
      content: <FormStringField label={'From'} value={from} onChange={setFrom} required />,
      onClick: () => {
        if (!printSettings?.allowCustomFrom) {
          toast.show('Custom from is not allowed');
        }
      },
    },
  ];

  const replyToTabs = [
    {
      id: 'default',
      label: 'Default Reply To',
      content: <FormStringField label={'Reply To'} value={replyTo} disabled />,
      onClick: () => {
        setReplyTo(printSettings?.defaultReplyTo ?? '');
      },
    },
    {
      id: 'employee',
      label: 'Reply To You',
      content: <FormStringField label={'Reply To'} value={replyTo} disabled />,
      disabled: !currentEmployee?.email,
      onClick: () => {
        if (!currentEmployee?.email) {
          toast.show('You do not have a email set');
          return;
        }

        setReplyTo(currentEmployee.email);
      },
    },
    {
      id: 'custom',
      label: 'Custom Reply To',
      disabled: !printSettings?.allowCustomReplyTo,
      content: <FormStringField label={'Reply To'} value={replyTo} onChange={setReplyTo} />,
      onClick: () => {
        if (!printSettings?.allowCustomReplyTo) {
          toast.show('Custom reply to is not allowed');
        }
      },
    },
  ];

  const [emailTab, setEmailTab] = useState(emailTabs[0]!.id);
  const [fromTab, setFromTab] = useState(fromTabs[0]!.id);
  const [replyToTab, setReplyToTab] = useState(replyToTabs[0]!.id);

  const printJobMutation = useWorkOrderPrintJobMutation({ fetch });

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(`Print Overview - ${name}`);
  screen.setIsLoading(
    settingsQuery.isLoading || workOrderQuery.isFetching || currentEmployeeQuery.isLoading || customerQuery.isLoading,
  );

  const print = async () => {
    if (!settings) {
      toast.show('Settings not loaded');
      return;
    }

    if (selectedTemplate === null) {
      toast.show('No template selected');
      return;
    }

    if (!settings.printing.global.defaultEmail) {
      toast.show('No printing email set');
      return;
    }

    // TODO: Ability to change these details as per monday tickets
    //  -> only show diff location options if franchise mode is enabled

    printJobMutation.mutate(
      {
        workOrderName: name,
        date: new Date().toLocaleDateString(),
        dueDate: new Date(dueDateUtc.getTime() + dueDateUtc.getTimezoneOffset() * MINUTE_IN_MS).toLocaleDateString(),
        templateName: selectedTemplate,
        from,
        replyTo,
        email,
      },
      {
        onSuccess() {
          toast.show('Sent printout!');
          router.popCurrent();
        },
      },
    );
  };

  if (settingsQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(settingsQuery.error, 'An error occurred while loading settings')}
        </Text>
      </Stack>
    );
  }

  if (!settings) {
    return null;
  }

  const TabsDisplay = ({
    tabs,
    setTab,
    selectedTabId,
  }: {
    tabs: typeof emailTabs | typeof fromTabs | typeof replyToTabs;
    setTab: (tabId: string) => void;
    selectedTabId: string;
  }) => (
    <>
      <SegmentedControl
        segments={tabs.map(tab => ({ id: tab.id, label: tab.label, disabled: tab.disabled ?? false }))}
        onSelect={tabId => {
          setTab(tabId);
          tabs.find(tab => tab.id === tabId)?.onClick?.();
        }}
        selected={selectedTabId}
      />

      {tabs.find(tab => tab.id === selectedTabId)?.content}
    </>
  );

  return (
    <ScrollView>
      <Form disabled={printJobMutation.isPending}>
        <Stack direction={'vertical'} spacing={4}>
          {TabsDisplay({ tabs: emailTabs, setTab: setEmailTab, selectedTabId: emailTab })}
          {TabsDisplay({ tabs: fromTabs, setTab: setFromTab, selectedTabId: fromTab })}
          {TabsDisplay({ tabs: replyToTabs, setTab: setReplyToTab, selectedTabId: replyToTab })}

          <Text variant={'headingLarge'}>Choose a template</Text>

          <RadioButtonList
            items={Object.keys(settings.workOrders.printTemplates)}
            onItemSelected={setSelectedTemplate}
            initialSelectedItem={selectedTemplate ?? undefined}
          />

          {Object.keys(settings.workOrders.printTemplates).length === 0 && (
            <Text color={'TextSubdued'}>No templates available</Text>
          )}

          <FormButton
            title={'Print'}
            disabled={selectedTemplate === null}
            action={'submit'}
            loading={printJobMutation.isPending}
            onPress={print}
            type={'primary'}
          />
        </Stack>
      </Form>
    </ScrollView>
  );
}
