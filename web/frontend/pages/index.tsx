import { Card, Page, Layout, InlineStack, Text, Spinner, BlockStack, Frame } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import React, { useEffect, useState } from 'react';
import { useAuthenticatedFetch, useToast } from '@teifi-digital/shopify-app-react';
import { AppInfo } from '../../controllers/api/app-info.js';

export default function HomePage() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
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
      <BlockStack>
        <Text variant="headingMd" as="h1">
          {appInfo.name} is running 🎉
        </Text>
        <InlineStack gap="100" blockAlign="center">
          <Text variant="headingSm" as="span">
            App Version:
          </Text>
          <Text variant="bodySm" as="span">
            {appInfo.version}
          </Text>
        </InlineStack>
      </BlockStack>
    );

  return (
    <Frame>
      <Page narrowWidth>
        <TitleBar title={appInfo?.name ?? ''} />
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
