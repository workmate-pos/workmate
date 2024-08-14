import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { RadioButtonList, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useForm } from '@teifi-digital/pos-tools/form';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { usePurchaseOrderPrintJobMutation } from '@work-orders/common/queries/use-purchase-order-print-job-mutation.js';
import { useRouter } from '../routes.js';

export function PurchaseOrderPrintOverview({ name }: { name: string }) {
  const fetch = useAuthenticatedFetch();

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  const printJobMutation = usePurchaseOrderPrintJobMutation({ fetch });

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(`Print Overview - ${name}`);
  screen.setIsLoading(settingsQuery.isLoading);

  const { Form } = useForm();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const print = async () => {
    if (!settings) {
      toast.show('Settings not loaded');
      return;
    }

    if (selectedTemplate === null) {
      toast.show('No template selected');
      return;
    }

    printJobMutation.mutate(
      {
        purchaseOrderName: name,
        date: new Date().toLocaleDateString(),
        templateName: selectedTemplate,
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
      <Form disabled={printJobMutation.isLoading}>
        <Stack direction={'vertical'} spacing={4}>
          <Text variant={'headingLarge'}>Choose a template</Text>
          <RadioButtonList
            items={Object.keys(settings.purchaseOrderPrintTemplates)}
            onItemSelected={setSelectedTemplate}
            initialSelectedItem={selectedTemplate ?? undefined}
          />
          {Object.keys(settings.purchaseOrderPrintTemplates).length === 0 && (
            <Text color={'TextSubdued'}>No templates available</Text>
          )}
          <FormButton
            title={'Print'}
            disabled={selectedTemplate === null}
            action={'submit'}
            loading={printJobMutation.isLoading}
            onPress={print}
            type={'primary'}
          />
        </Stack>
      </Form>
    </ScrollView>
  );
}
