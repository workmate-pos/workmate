import { BlockStack, Card, InlineStack, Spinner, Text } from '@shopify/polaris';
import React, { useEffect, useState } from 'react';
import { ToastActionCallable, useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';
import { AppInfo } from '@teifi-digital/shopify-app-express/controllers/default-api/app-info';

export type AppInfoCardProps = {
  setToastAction: ToastActionCallable;
};

export function AppInfoCard({ setToastAction }: AppInfoCardProps) {
  const [appInfo, setAppInfo] = useState<AppInfo>();
  const fetch = useAuthenticatedFetch(setToastAction);

  useEffect(() => {
    fetch('/api/app-info', {}, { newContext: false })
      .then(res => res.json())
      .then(({ appInfo }) => setAppInfo(appInfo));
  }, []);

  return (
    <Card>
      {appInfo == null ? (
        <Spinner accessibilityLabel="AppInfo is loading" size="small" />
      ) : (
        <BlockStack>
          <Text variant="headingMd" as="h1">
            {appInfo.name} is running 🎉
          </Text>
          <InlineStack blockAlign="center" gap="100">
            <Text variant="headingSm" as="span">
              App Version:
            </Text>
            <Text variant="bodyMd" as="span">
              {appInfo.version}
            </Text>
          </InlineStack>
        </BlockStack>
      )}
    </Card>
  );
}
