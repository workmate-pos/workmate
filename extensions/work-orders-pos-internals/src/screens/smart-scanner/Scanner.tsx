import {
  ScrollView,
  useApi,
  useScannerSourcesSubscription,
  CameraScanner,
} from '@shopify/ui-extensions-react/point-of-sale';
import { useScannerDataSubscription } from '@shopify/ui-extensions-react/point-of-sale';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';

export function Scanner() {
  const scannerData = useScannerDataSubscription();
  const scannerSources = useScannerSourcesSubscription();

  return (
    <ScrollView>
      <ResponsiveGrid columns={2} grow>
        {scannerSources.length === 1 && scannerSources.includes('camera') && <CameraScanner />}
      </ResponsiveGrid>
    </ScrollView>
  );
}
