import { Page, Layout, Frame } from '@shopify/polaris';
import { AppInfoCard } from '../components/AppInfoCard.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { AppPlanCard } from '../components/AppPlanCard.js';

export default function HomePage() {
  const [toast, setToastAction] = useToast();

  return (
    <Frame>
      <Page narrowWidth title={'WorkMate'}>
        <Layout>
          <Layout.Section>
            <AppInfoCard setToastAction={setToastAction} />
          </Layout.Section>
          <Layout.Section>
            <AppPlanCard setToastAction={setToastAction} />
          </Layout.Section>
        </Layout>
      </Page>
      {toast}
    </Frame>
  );
}
