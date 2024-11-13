import {
  TextField,
  ResourceList,
  ResourceItem,
  Text,
  BlockStack,
  Banner,
  Thumbnail,
  InlineStack,
} from '@shopify/polaris';
import { useEffect, useState } from 'react';
import { useScanVariantsQuery } from '@work-orders/common/queries/use-scan-variants-query.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useToast } from '@teifi-digital/shopify-app-react';

type Props = {
  onProductScanned: (product: ProductVariant) => void;
  disabled?: boolean;
};

export function BarcodeTextField({ onProductScanned, disabled }: Props) {
  const [toast, setToastAction] = useToast();
  const [barcode, setBarcode] = useState('');
  const [variantIdCount, setVariantIdCount] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const fetch = useAuthenticatedFetch({ setToastAction });

  const scanVariantsQuery = useScanVariantsQuery({ fetch, scanData: barcode });

  // Local subtitle function to format product details
  const getProductSubtitle = (variant: ProductVariant) => {
    const details = [
      variant.sku && { label: 'SKU', value: variant.sku },
      variant.barcode && { label: 'Barcode', value: variant.barcode },
    ].filter(Boolean);

    return (
      <BlockStack gap="100">
        {details.map(
          detail =>
            detail && (
              <Text variant="bodySm" tone="subdued" as="span" key={detail.label}>
                {`${detail.label}: ${detail.value}`}
              </Text>
            ),
        )}
      </BlockStack>
    );
  };

  useEffect(() => {
    if (!barcode) return;
    if (scanVariantsQuery.isLoading) return;

    if (scanVariantsQuery.isError) {
      setError(extractErrorMessage(scanVariantsQuery.error, 'Error finding product'));
      setBarcode('');
      return;
    }

    const variants = (scanVariantsQuery.data ?? []) satisfies ProductVariant[];

    if (variants.length === 0) {
      setError('No products found');
      setBarcode('');
      return;
    }

    if (variants.length === 1) {
      const variant = variants[0];

      if (variant === undefined) {
        setError('No variant found');
        setBarcode('');
        return;
      }

      handleProductSelect(variant);
      setBarcode('');
    }
  }, [barcode, scanVariantsQuery.data, scanVariantsQuery.isError, scanVariantsQuery.error]);

  // Adjusted handleProductSelect function
  const handleProductSelect = (variant: ProductVariant) => {
    const name = getProductVariantName(variant) ?? 'Unknown product';
    setToastAction({ content: `Added ${name}` });
    onProductScanned(variant);
    setVariantIdCount(current => ({
      ...current,
      [variant.id]: (current[variant.id] ?? 0) + 1,
    }));
  };

  const variants = scanVariantsQuery.data ?? [];

  return (
    <BlockStack gap="400">
      {error && <Banner title={error} tone="critical" onDismiss={() => setError(null)} />}

      {toast}

      <TextField
        label="Scan barcode"
        value={barcode}
        onChange={setBarcode}
        disabled={disabled}
        autoComplete="off"
        clearButton
        onClearButtonClick={() => {
          setBarcode('');
          setVariantIdCount({});
        }}
        helpText="Scan a barcode or type it manually"
        autoFocus
      />

      {variants.length > 0 && (
        <BlockStack gap="400">
          {variants.length > 1 && (
            <Banner title="Multiple products found. Select the one(s) you want to add." tone="warning" />
          )}
          <ResourceList
            items={variants}
            renderItem={variant => (
              <ResourceItem
                id={variant.id}
                onClick={() => handleProductSelect(variant)}
                media={
                  <InlineStack gap="200" blockAlign="center">
                    <Thumbnail
                      source={variant.image?.url ?? variant.product?.featuredImage?.url ?? ''}
                      alt={getProductVariantName(variant) ?? 'Product'}
                      size="small"
                    />
                  </InlineStack>
                }
              >
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="bold" as="span">
                    {getProductVariantName(variant) ?? 'Unnamed Product'}
                    {(variantIdCount[variant.id] ?? 0) > 0 && ` (${variantIdCount[variant.id] ?? 0})`}
                  </Text>
                  {getProductSubtitle(variant)}
                </BlockStack>
              </ResourceItem>
            )}
          />
        </BlockStack>
      )}
    </BlockStack>
  );
}
