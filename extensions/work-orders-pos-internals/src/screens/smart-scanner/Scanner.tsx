import {
  ScrollView,
  useApi,
  useScannerSourcesSubscription,
  CameraScanner,
  Button,
  Banner,
  Text,
  List,
} from '@shopify/ui-extensions-react/point-of-sale';
import { useScannerDataSubscription } from '@shopify/ui-extensions-react/point-of-sale';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScanVariantsQuery } from '@work-orders/common/queries/use-scan-variants-query.js';
import { useEffect, useState } from 'react';
import { ListRow } from '@shopify/ui-extensions/point-of-sale';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';

export function Scanner() {
  const { cart, toast } = useApi<'pos.home.modal.render'>();
  const scannerData = useScannerDataSubscription();
  const scannerSources = useScannerSourcesSubscription();

  const fetch = useAuthenticatedFetch();
  const scanVariantsQuery = useScanVariantsQuery({ fetch, scanData: scannerData.data });

  const [variantIdCount, setVariantIdCount] = useState<Record<ID, number>>({});
  const [lastScannedData, setLastScannedData] = useState<string | null>(null);

  useEffect(() => {
    if (scannerData.data !== lastScannedData) {
      setVariantIdCount({});
      setLastScannedData(scannerData.data ?? null);
    }
  }, [scannerData.data]);

  useEffect(() => {
    if (scanVariantsQuery.isSuccess && scanVariantsQuery.data.length === 1) {
      // If we find just one variant we can just add it immediately
      const variant = scanVariantsQuery.data[0]!;

      const currentCount = variantIdCount[variant.id] ?? 0;
      const newCount = currentCount + 1;

      cart.addLineItem(Number(parseGid(variant.id).id), 1);
      toast.show(`Added ${getProductVariantName(variant) ?? 'unknown product'} (Qty: ${newCount})!`, {
        duration: 1000,
      });
      setVariantIdCount(current => ({ ...current, [variant.id]: newCount }));
    }
  }, [scanVariantsQuery.data, scannerData.data]);

  const shouldShowCamera = scannerSources.length === 1 && scannerSources.includes('camera');

  return (
    <ScrollView>
      <ResponsiveStack direction="vertical" spacing={2} paddingVertical="ExtraLarge">
        {shouldShowCamera && <CameraScanner />}

        {!!scannerData.data && (
          <ResponsiveStack direction="horizontal" alignment="center" flex={1}>
            <Text>{scannerData.data}</Text>
          </ResponsiveStack>
        )}

        <Banner
          title="No product(s) found"
          variant="information"
          visible={scanVariantsQuery.isSuccess && scanVariantsQuery.data.length === 0}
        />
        <Banner
          title="Multiple products found. Select the one(s) you want to add."
          variant="alert"
          visible={scanVariantsQuery.isSuccess && scanVariantsQuery.data.length > 1}
        />
        <Banner title="Error loading scan variants" variant="error" visible={scanVariantsQuery.isError} />

        {scanVariantsQuery.isLoading && <Button title="" type="plain" isDisabled isLoading />}

        <List
          imageDisplayStrategy="always"
          data={
            scanVariantsQuery.data?.map<ListRow>(variant => {
              const imageUrl = variant.image?.url ?? variant.product?.featuredImage?.url;
              const name = getProductVariantName(variant) ?? 'Unknown product';
              const quantity = variantIdCount[variant.id] ?? 0;

              return {
                id: variant.id,
                leftSide: {
                  label: name,
                  image: {
                    source: imageUrl,
                    badge: quantity,
                  },
                  subtitle: getSubtitle([`SKU: ${variant.sku}`, `Barcode: ${variant.barcode}`]),
                },
                onPress: () => {
                  cart.addLineItem(Number(parseGid(variant.id).id), 1);
                  setVariantIdCount(current => ({ ...current, [variant.id]: quantity + 1 }));
                },
              };
            }) ?? []
          }
        />
      </ResponsiveStack>
    </ScrollView>
  );
}
