import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useForm } from '@teifi-digital/pos-tools/form';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { useMutation } from '@work-orders/common/queries/react-query.js';
import {
  Button,
  CameraScanner,
  Text,
  useExtensionApi,
  useScannerDataSubscription,
  useScannerSourcesSubscription,
} from '@shopify/retail-ui-extensions-react';
import { useEffect, useState } from 'react';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useRouter } from '../routes.js';
import { useProductVariantByBarcodeQuery } from '@work-orders/common/queries/use-product-variant-by-barcode-query.js';
import { extractErrorMessage } from '@teifi-digital/pos-tools/utils/errors.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';

export function Entry() {
  const { Form } = useForm();
  const { toast, navigation, session } = useExtensionApi<'pos.home.modal.render'>();
  const router = useRouter();

  const locationId = createGid('Location', session.currentSession.locationId.toString());

  // TODO: Allow selecting which products to include in the cycle count
  // TODO: Allow shortcuts to select all products for some vendor at the current location

  const fetch = useAuthenticatedFetch();
  const locationQuery = useLocationQuery({ fetch, id: locationId });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    },
    onSuccess() {
      toast.show('Updated inventory!');
      navigation.dismiss();
    },
  });

  const locationName = (() => {
    if (!locationId) {
      return '';
    }

    if (locationQuery.isLoading) {
      return 'Loading...';
    }

    return locationQuery.data?.name ?? 'Unknown location';
  })();

  const { data } = useScannerDataSubscription();
  const availableScanners = useScannerSourcesSubscription();
  const hasCamera = availableScanners.includes('camera');
  const hasScanner = availableScanners.length > 0;
  const [cameraOpened, setCameraOpened] = useState(false);

  const scannedProductVariantQuery = useProductVariantByBarcodeQuery(
    { fetch, barcode: data ?? '' },
    { enabled: !!data, retry: false },
  );

  const scanErrorMessage = scannedProductVariantQuery.isError
    ? extractErrorMessage(scannedProductVariantQuery.error)
    : null;

  const scanSuccessMessage = scannedProductVariantQuery.isSuccess
    ? `Added ${getProductVariantName(scannedProductVariantQuery.data) ?? '?'}`
    : null;

  useEffect(() => {
    if (!cameraOpened) {
      if (scanSuccessMessage) {
        toast.show(scanSuccessMessage);
      }

      if (scanErrorMessage) {
        toast.show(scanErrorMessage);
      }
    }
  }, [scanErrorMessage, scanSuccessMessage]);

  useEffect(() => {
    if (scannedProductVariantQuery.data) {
      // TODO: Add/inc
    }
  }, [scannedProductVariantQuery.data]);

  return (
    <Form>
      <ResponsiveStack spacing={4} direction={'vertical'}>
        <ResponsiveGrid columns={4} grow>
          <FormStringField label={'Location'} type={'normal'} value={locationName} disabled />
        </ResponsiveGrid>

        {hasScanner && !hasCamera && <Text>Scanner found</Text>}
        {!hasScanner && <Text color={'TextCritical'}>No scanner found</Text>}
        {hasCamera && (
          <>
            {cameraOpened && <Button title={'Close camera'} onPress={() => setCameraOpened(false)} />}
            {!cameraOpened && <Button title={'Open camera'} onPress={() => setCameraOpened(true)} />}
            {cameraOpened && (
              <CameraScanner
                bannerProps={{
                  visible: (scanSuccessMessage ?? scanErrorMessage) !== null,
                  title: scanSuccessMessage ?? scanErrorMessage ?? '',
                  variant: scanErrorMessage !== null ? 'error' : 'confirmation',
                }}
              />
            )}
          </>
        )}

        <FormButton
          title={'Save'}
          type={'primary'}
          action={'submit'}
          loading={saveMutation.isLoading}
          onPress={saveMutation.mutate}
        />
      </ResponsiveStack>
    </Form>
  );
}
