import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useWorkOrderPrintJobMutation } from '@work-orders/common/queries/use-work-order-print-job-mutation.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { RadioButtonList, ScrollView, Stack, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { useState } from 'react';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { useRouter } from '../../routes.js';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';

export function WorkOrderPrintOverview({ name, dueDateUtc }: { name: string; dueDateUtc: Date }) {
  const dueDateLocal = new Date(dueDateUtc.getTime() + dueDateUtc.getTimezoneOffset() * MINUTE_IN_MS);

  const fetch = useAuthenticatedFetch();

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  const printJobMutation = useWorkOrderPrintJobMutation({ fetch });

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(`Print Overview - ${name}`);
  screen.setIsLoading(settingsQuery.isLoading);

  const { toast } = useApi<'pos.home.modal.render'>();

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
        dueDate: dueDateLocal.toLocaleDateString(),
        templateName: selectedTemplate,
        from: settings.printing.global.defaultFrom,
        replyTo: settings.printing.global.defaultReplyTo,
        email: settings.printing.global.defaultEmail,
      },
      {
        onSuccess() {
          toast.show('Sent print job to printer!');
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

  return (
    <ScrollView>
      <Form disabled={printJobMutation.isPending}>
        <Stack direction={'vertical'} spacing={4}>
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
