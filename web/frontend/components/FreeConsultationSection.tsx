import { BlockStack, Button, InlineStack, LegacyCard, Text } from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';

const PLAN_URL = 'https://calendar.app.google/1ykg2MeUSEigV9h69';

export function FreeConsultationSection() {
  const app = useAppBridge();

  return (
    <LegacyCard
      sectioned
      title={
        <Text variant={'headingLg'} as={'h1'}>
          Consultation
        </Text>
      }
    >
      <BlockStack gap="400">
        <Text variant={'bodyMd'} as={'p'}>
          Book a free consultation session to learn more about WorkMate and how to get started.
        </Text>

        <InlineStack>
          <Button
            variant={'primary'}
            onClick={() =>
              Redirect.create(app).dispatch(Redirect.Action.REMOTE, {
                url: PLAN_URL,
                newContext: true,
              })
            }
          >
            Book an appointment
          </Button>
        </InlineStack>
      </BlockStack>
    </LegacyCard>
  );
}
