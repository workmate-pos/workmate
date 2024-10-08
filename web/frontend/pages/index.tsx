import { Page, Layout, Frame } from '@shopify/polaris';
import { AppInfoCard } from '../components/AppInfoCard.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { AppPlanCard } from '../components/AppPlanCard.js';
import { WelcomeSection } from '@web/frontend/components/WelcomeSection.js';
import { FreeConsultationSection } from '@web/frontend/components/FreeConsultationSection.js';
import { TitleBar } from '@shopify/app-bridge-react';

export default function HomePage() {
  const [toast, setToastAction] = useToast();

  return (
    <Frame>
      <Page narrowWidth>
        <TitleBar title="" />

        <Layout>
          <Layout.Section>
            <WelcomeSection />
          </Layout.Section>
          <Layout.Section>
            <FreeConsultationSection />
          </Layout.Section>
          <Layout.Section>
            <AppPlanCard setToastAction={setToastAction} />
          </Layout.Section>
          <Layout.Section>
            <AppInfoCard setToastAction={setToastAction} />
          </Layout.Section>
        </Layout>
      </Page>
      {toast}
    </Frame>
  );
}
