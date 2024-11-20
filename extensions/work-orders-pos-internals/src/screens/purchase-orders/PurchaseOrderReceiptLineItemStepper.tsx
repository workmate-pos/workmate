import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useState } from 'react';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { Banner, Button, Image, ScrollView, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { Grid } from '../../components/Grid.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';

export function PurchaseOrderReceiptLineItemStepper({
  productVariantId,
  initialQuantity,
  min,
  max,
  onChange,
}: {
  productVariantId: ID;
  initialQuantity: number;
  min?: number;
  max?: number;
  onChange: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(initialQuantity);

  const fetch = useAuthenticatedFetch();
  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId });

  const screen = useScreen();
  screen.setIsLoading(productVariantQuery.isLoading);

  if (productVariantQuery.isError) {
    return (
      <ScrollView>
        <Banner
          title="Error loading product variant"
          variant="error"
          onPress={() => productVariantQuery.refetch()}
          action="Retry"
          visible
        />
      </ScrollView>
    );
  }

  if (!productVariantQuery.isSuccess) {
    return null;
  }

  const productVariant = productVariantQuery.data;
  const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;
  const title = getProductVariantName(productVariant) ?? 'Unknown product variant';

  screen.setTitle(title);

  return (
    <ScrollView>
      <Stack direction="vertical" spacing={2}>
        <Stack direction="horizontal" spacing={1}>
          <Image src={imageUrl} />
          <Text variant="headingLarge">{title}</Text>
        </Stack>

        <Grid columns={1}>
          {min !== undefined && (
            <Button
              type="basic"
              onPress={() => {
                setQuantity(min);
                onChange(min);
              }}
              isDisabled={min === quantity}
              title={`Min (${min})`}
            />
          )}

          <Grid columns={3}>
            {(
              [
                [`-`, Math.max(min ?? quantity - 1, quantity - 1)],
                [String(quantity), quantity],
                [`+`, Math.min(max ?? quantity + 1, quantity + 1)],
              ] as const
            ).map(([label, value], i) => (
              <Button
                key={i}
                type="basic"
                onPress={() => {
                  setQuantity(value);
                  onChange(value);
                }}
                isDisabled={value === quantity}
                title={label}
              />
            ))}
          </Grid>

          {max !== undefined && (
            <Button
              type="basic"
              onPress={() => {
                setQuantity(max);
                onChange(max);
              }}
              isDisabled={max === quantity}
              title={`Max (${max})`}
            />
          )}
        </Grid>
      </Stack>
    </ScrollView>
  );
}
