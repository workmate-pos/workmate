import {
  Button,
  Text,
  useExtensionApi,
  useScannerSourcesSubscription,
  useStatefulSubscribableScannerData,
} from '@shopify/retail-ui-extensions-react';
import { useRouter } from '../routes.js';
import { useEffect, useState } from 'react';
import { useProductVariantByBarcodeQueries } from '@work-orders/common/queries/use-product-variant-by-barcode-query.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';

/**
 * Component that handles product scanning.
 * Automatically finds the product variant belonging to the scanned barcode.
 * Displays whether a scanner has been found or not.
 * Allows for opening the camera if present.
 */
export function ProductScanner({
  onProductScanned,
  disabled = false,
}: {
  onProductScanned: (productVariant: ProductVariant) => void;
  disabled?: boolean;
}) {
  const sources = useScannerSourcesSubscription();

  const noSourcesAvailableText = sources.length === 0 ? <Text color={'TextCritical'}>No scanners found</Text> : null;

  const router = useRouter();

  // TODO: Banner in camera somehow?
  const openCameraButton = sources.includes('camera') ? (
    <Button title={'Open Camera'} isDisabled={disabled} onPress={() => router.push('Camera', {})} />
  ) : null;

  const scannerDataSubscribable = useStatefulSubscribableScannerData();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const [pendingBarcodes, setPendingBarcodes] = useState<string[]>([]);

  const fetch = useAuthenticatedFetch({ throwOnError: false, showToastOnError: false });
  const productVariantQueries = useProductVariantByBarcodeQueries(
    { fetch, barcodes: unique(pendingBarcodes) },
    { retry: false },
  );

  useEffect(() => {
    setPendingBarcodes(barcodes => {
      const filtered = barcodes.filter(barcode => {
        const query = productVariantQueries[barcode];

        if (!query) {
          return true;
        }

        if (query.isLoading) {
          return true;
        }

        if (query.isError) {
          toast.show(extractErrorMessage(query.error, 'Error finding product for this barcode'));
          return false;
        }

        if (!query.data) {
          toast.show('Barcode not found');
          return false;
        }

        onProductScanned(query.data);
        const name = getProductVariantName(query.data) ?? 'Unknown Product';
        toast.show(`Scanned ${name}`);
        return false;
      });

      if (filtered.length === barcodes.length) {
        return barcodes;
      }

      return filtered;
    });
  }, [Object.values(productVariantQueries).map(q => q.status)]);

  useEffect(() => {
    let lastScanDate = new Date(0);

    const unsubscribe = scannerDataSubscribable.subscribe(scan => {
      const elapsedMs = new Date().getTime() - lastScanDate.getTime();

      // phone/tablet camera is not as reliable as a laser scanner so we should have a bigger delay to allow the reading to 'flicker'
      // e.g. going from reading, to unreadable, to reading again
      const delay = scan.source === 'camera' ? 1000 : 250;

      const barcode = scan.data;
      if (elapsedMs >= delay && barcode !== undefined) {
        setPendingBarcodes(pendingBarcodes => [...pendingBarcodes, barcode]);
      }

      lastScanDate = new Date();
    });

    return unsubscribe;
  }, []);

  return (
    <ResponsiveStack direction={'vertical'} spacing={1}>
      {noSourcesAvailableText}
      {openCameraButton}
    </ResponsiveStack>
  );
}
