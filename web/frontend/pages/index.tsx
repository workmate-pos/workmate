import { Card, Page, Layout, HorizontalStack, Text, Spinner, VerticalStack, Frame } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import React, { useEffect, useState } from 'react';
import { AppInfo } from '../../controllers/api/app-info';
import { useAuthenticatedFetch, useToast } from '@teifi-digital/shopify-app-react';

export default function HomePage() {
  const [appInfo, setAppInfo] = useState<AppInfo>(null);
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch(setToastAction);

  useEffect(() => {
    fetch('/api/app-info', {})
      .then(res => res.json())
      .then(({ appInfo }) => setAppInfo(appInfo));
  }, []);

  const appInfoMarkup =
    appInfo == null ? (
      <Spinner accessibilityLabel="AppInfo is loading" size="small" />
    ) : (
      <VerticalStack>
        <Text variant="headingMd" as="h1">
          {appInfo.name} is running 🎉
        </Text>
        <HorizontalStack gap="1" blockAlign="center">
          <Text variant="headingSm" as="span">
            App Version:
          </Text>
          <Text variant="bodySm" as="span">
            {appInfo.version}
          </Text>
        </HorizontalStack>
      </VerticalStack>
    );

  return (
    <Frame>
      <Page narrowWidth>
        <TitleBar title={appInfo?.name ?? ''} primaryAction={null} />
        <Layout>
          <Layout.Section>
            <Card>{appInfoMarkup}</Card>
          </Layout.Section>
        </Layout>
      </Page>
      {toast}
    </Frame>
  );
}
