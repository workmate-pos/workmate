import { ToastActionCallable } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { usePurchaseOrderPrintJobMutation } from '@work-orders/common/queries/use-purchase-order-print-job-mutation.js';
import { Box, FormLayout, Modal, Select, Tabs, TextField } from '@shopify/polaris';
import { useWorkOrderPrintJobMutation } from '@work-orders/common/queries/use-work-order-print-job-mutation.js';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useEffect, useState } from 'react';

type PrintModalProps = PrintModalPropsBase &
  (
    | {
        type: 'work-order' | 'purchase-order';
        dueDateUtc: Date;
      }
    | {
        type: 'purchase-order' | 'cycle-count';
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

  const [printTemplate, setPrintTemplate] = useState('');

  const purchaseOrderPrintJobMutation = usePurchaseOrderPrintJobMutation({ fetch });
  const workOrderPrintJobMutation = useWorkOrderPrintJobMutation({ fetch });

  const workOrderQuery = useWorkOrderQuery({ fetch, name }, { enabled: props.type === 'work-order' });
  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name }, { enabled: props.type === 'purchase-order' });

  const workOrder = workOrderQuery.data?.workOrder;
  const purchaseOrder = purchaseOrderQuery.data;

  const customerQuery = useCustomerQuery({ fetch, id: workOrder?.customerId ?? null });
  const customer = customerQuery.data;

  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });
  const currentEmployee = currentEmployeeQuery.data;

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;
  const printSettings =
    settings?.printing.locationOverrides[workOrder?.locationId ?? purchaseOrder?.location?.id ?? ''] ??
    settings?.printing.global;

  const [email, setEmail] = useState('');
  const [from, setFrom] = useState('');
  const [replyTo, setReplyTo] = useState('');

  const isLoading = [settingsQuery.isLoading, workOrderQuery.isFetching, purchaseOrderQuery.isFetching].includes(true);
  const isSubmitting = [purchaseOrderPrintJobMutation.isPending, workOrderPrintJobMutation.isPending].includes(true);

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
      label: 'Default email',
      content: <TextField autoComplete="off" label={'Email'} value={email} disabled requiredIndicator />,
      onClick: () => {
        setEmail(printSettings?.defaultEmail ?? '');
      },
    },
    {
      id: 'employee',
      label: 'Your email',
      content: <TextField autoComplete="off" label={'Email'} value={email} disabled requiredIndicator />,
      disabled: !currentEmployee?.email,
      onClick: () => {
        if (!currentEmployee?.email) {
          setToastAction({ content: 'You do not have an email address set' });
          return;
        }

        setEmail(currentEmployee.email);
      },
    },
    {
      id: 'customer',
      label: 'Customer email',
      content: <TextField autoComplete="off" label={'Email'} value={email} disabled requiredIndicator />,
      disabled: !customer?.email,
      hidden: props.type === 'purchase-order',
      onClick: () => {
        if (!customer?.email) {
          setToastAction({ content: 'Customer does not have an email address set' });
          return;
        }

        setEmail(customer.email);
      },
    },
    {
      id: 'custom',
      label: 'Custom email',
      disabled: !printSettings?.allowCustomEmail,
      content: (
        <TextField
          disabled={isSubmitting}
          autoComplete="off"
          label={'Email'}
          value={email}
          onChange={setEmail}
          requiredIndicator
        />
      ),
      onClick: () => {
        if (!printSettings?.allowCustomEmail) {
          setToastAction({ content: 'Custom email is not allowed' });
        }
      },
    },
  ];

  const fromTabs = [
    {
      id: 'default',
      label: 'Default from',
      content: <TextField autoComplete="off" label={'From'} value={from} disabled requiredIndicator />,
      onClick: () => {
        setFrom(printSettings?.defaultFrom ?? '');
      },
    },
    {
      id: 'employee',
      label: 'From you',
      content: <TextField autoComplete="off" label={'From'} value={from} disabled requiredIndicator />,
      disabled: !currentEmployee?.name,
      onClick: () => {
        if (!currentEmployee?.name) {
          setToastAction({ content: 'You do not have a name set' });
          return;
        }

        setFrom(currentEmployee.name);
      },
    },
    {
      id: 'custom',
      label: 'Custom from',
      disabled: !printSettings?.allowCustomFrom,
      content: (
        <TextField
          disabled={isSubmitting}
          autoComplete="off"
          label={'From'}
          value={from}
          onChange={setFrom}
          requiredIndicator
        />
      ),
      onClick: () => {
        if (!printSettings?.allowCustomFrom) {
          setToastAction({ content: 'Custom from is not allowed' });
        }
      },
    },
  ];

  const replyToTabs = [
    {
      id: 'default',
      label: 'Default reply-to',
      content: <TextField autoComplete="off" label={'Reply-to'} value={replyTo} disabled />,
      onClick: () => {
        setReplyTo(printSettings?.defaultReplyTo ?? '');
      },
    },
    {
      id: 'employee',
      label: 'Reply to you',
      content: <TextField autoComplete="off" label={'Reply-to'} value={replyTo} disabled />,
      disabled: !currentEmployee?.email,
      onClick: () => {
        if (!currentEmployee?.email) {
          setToastAction({ content: 'You do not have a email set' });
          return;
        }

        setReplyTo(currentEmployee.email);
      },
    },
    {
      id: 'custom',
      label: 'Custom reply-to',
      disabled: !printSettings?.allowCustomReplyTo,
      content: (
        <TextField
          disabled={isSubmitting}
          autoComplete="off"
          label={'Reply-to'}
          value={replyTo}
          onChange={setReplyTo}
        />
      ),
      onClick: () => {
        if (!printSettings?.allowCustomReplyTo) {
          setToastAction({ content: 'Custom reply to is not allowed' });
        }
      },
    },
  ];

  const [emailTab, setEmailTab] = useState(emailTabs[0]!.id);
  const [fromTab, setFromTab] = useState(fromTabs[0]!.id);
  const [replyToTab, setReplyToTab] = useState(replyToTabs[0]!.id);

  const printTemplatesKey = props.type === 'work-order' ? 'workOrders' : 'purchaseOrders';
  const printTemplates = settingsQuery.data?.settings[printTemplatesKey].printTemplates ?? {};

  const TabsDisplay = ({
    tabs,
    setTab,
    selectedTabId,
    disabled,
  }: {
    tabs: typeof emailTabs | typeof fromTabs | typeof replyToTabs;
    setTab: (tabId: string) => void;
    selectedTabId: string;
    disabled?: boolean;
  }) => (
    <Tabs
      fitted
      disabled={disabled}
      tabs={tabs
        .filter(tab => !('hidden' in tab) || !tab.hidden)
        .map(tab => ({
          id: tab.id,
          content: tab.label,
          selected: tab.id === selectedTabId,
          disabled: tab.disabled,
          onAction: () => {
            setTab(tab.id);
            tabs.find(({ id }) => id === tab.id)?.onClick?.();
          },
        }))}
      selected={tabs.filter(tab => !('hidden' in tab) || !tab.hidden).findIndex(tab => tab.id === selectedTabId)}
    >
      <Box paddingInline={'400'} paddingBlock={'200'}>
        {tabs.find(tab => tab.id === selectedTabId)?.content}
      </Box>
    </Tabs>
  );

  return (
    <Modal
      open={open}
      title={'Print'}
      onClose={onClose}
      loading={isLoading}
      primaryAction={{
        content: 'Print',
        disabled: isLoading || !printTemplate,
        loading: isSubmitting,
        onAction: () => {
          if (!name) {
            setToastAction({ content: `You must save this ${props.type.replace('-', ' ')} before printing!` });
            return;
          }

          if (isLoading) {
            return;
          }

          if (!email) {
            setToastAction({ content: 'Print email is not configured' });
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
                templateName: printTemplate,
                replyTo,
                email,
                from,
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
                templateName: printTemplate,
                replyTo,
                email,
                from,
              },
              {
                onSuccess() {
                  setToastAction({ content: 'Sent print job to printer!' });
                  onClose();
                },
              },
            );
          } else if (props.type === 'cycle-count') {
            console.log('Cycle count printing not implemented');
          } else {
            return props.type satisfies never;
          }
        },
      }}
    >
      <Modal.Section>
        {TabsDisplay({ tabs: emailTabs, setTab: setEmailTab, selectedTabId: emailTab, disabled: isSubmitting })}
      </Modal.Section>
      <Modal.Section>
        {TabsDisplay({ tabs: fromTabs, setTab: setFromTab, selectedTabId: fromTab, disabled: isSubmitting })}
      </Modal.Section>
      <Modal.Section>
        {TabsDisplay({ tabs: replyToTabs, setTab: setReplyToTab, selectedTabId: replyToTab, disabled: isSubmitting })}
      </Modal.Section>

      <Modal.Section>
        <FormLayout>
          <Select
            label={'Print template'}
            requiredIndicator
            disabled={isSubmitting}
            options={[
              {
                label: 'Select template',
                value: '',
                disabled: true,
              },

              ...Object.keys(printTemplates).map(templateName => ({
                label: templateName,
                value: templateName,
              })),
            ]}
            value={printTemplate}
            onChange={setPrintTemplate}
          />
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}
