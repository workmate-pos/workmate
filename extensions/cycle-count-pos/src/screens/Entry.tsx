import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useForm } from '@teifi-digital/pos-tools/form';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { Banner, List, ListRow, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { ProductScanner } from '../components/ProductScanner.js';
import { Dispatch, SetStateAction, useState } from 'react';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useRouter } from '../routes.js';
import { useCycleCountMutation } from '@work-orders/common/queries/use-cycle-count-mutation.ts.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { Int } from '@web/schemas/generated/create-product.js';

export function Entry() {
  const { Form } = useForm();
  const { toast, navigation, session } = useExtensionApi<'pos.home.modal.render'>();

  const locationId = createGid('Location', session.currentSession.locationId.toString());
  const [products, setProducts] = useState<Record<ID, number>>({});

  const fetch = useAuthenticatedFetch();
  const locationQuery = useLocationQuery({ fetch, id: locationId });

  const cycleCountMutation = useCycleCountMutation(
    { fetch },
    {
      onSuccess() {
        toast.show('Updated inventory!');
        navigation.dismiss();
      },
    },
  );

  const locationName = (() => {
    if (!locationId) {
      return '';
    }

    if (locationQuery.isLoading) {
      return 'Loading...';
    }

    return locationQuery.data?.name ?? 'Unknown location';
  })();

  const rows = useProductRows(products, setProducts);

  const router = useRouter();

  return (
    <Form disabled={cycleCountMutation.isLoading}>
      <ResponsiveStack spacing={4} direction={'vertical'}>
        <Banner
          visible={cycleCountMutation.isError}
          title={'Could not update inventory'}
          variant={'error'}
          action={extractErrorMessage(cycleCountMutation.error, '')}
        />

        <ResponsiveGrid columns={4} grow>
          <FormStringField label={'Location'} type={'normal'} value={locationName} disabled />

          <FormButton
            title={'Select Vendor'}
            onPress={() =>
              router.push('VendorSelector', {
                onSelect: (vendorName, productVariantIds) => {
                  toast.show(`Added products from vendor ${vendorName}`);
                  setProducts(products => ({
                    ...Object.fromEntries(productVariantIds.map(productVariantId => [productVariantId, 0])),
                    ...products,
                  }));
                },
              })
            }
          />

          <ProductScanner
            onProductScanned={productVariantId =>
              setProducts(products => {
                const newProducts = { ...products };
                newProducts[productVariantId] ??= 0;
                newProducts[productVariantId] += 1;
                return newProducts;
              })
            }
          />

          <FormButton title={'Clear'} onPress={() => setProducts({})} type={'destructive'} />
        </ResponsiveGrid>

        <List data={rows} imageDisplayStrategy={'always'} />
        {rows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No products scanned
            </Text>
          </Stack>
        )}

        <FormButton
          title={'Save'}
          type={'primary'}
          action={'submit'}
          disabled={Object.values(products).length === 0}
          loading={cycleCountMutation.isLoading}
          onPress={() =>
            cycleCountMutation.mutate({
              locationId,
              productVariants: Object.entries(products).map(([productVariantId, quantity]) => ({
                id: productVariantId as ID,
                quantity: quantity as Int,
              })),
            })
          }
        />
      </ResponsiveStack>
    </Form>
  );
}

function useProductRows(products: Record<ID, number>, setProducts: Dispatch<SetStateAction<Record<ID, number>>>) {
  const fetch = useAuthenticatedFetch();
  const ids = Object.keys(products) as ID[];
  const productVariantQueries = useProductVariantQueries({ fetch, ids });

  const router = useRouter();

  return ids.map<ListRow>(id => {
    const productVariantQuery = productVariantQueries[id]!;

    const productVariant = productVariantQuery.data;
    const name = productVariantQuery.isLoading
      ? 'Loading...'
      : getProductVariantName(productVariant) ?? 'Unknown Product';

    const quantity = products[id] ?? 0;

    return {
      id,
      onPress: () => {
        router.push('ProductConfig', {
          productVariantId: id,
          quantity,
          onRemove: () =>
            setProducts(products => {
              const newProducts = { ...products };
              delete newProducts[id];
              return newProducts;
            }),
          onSave: quantity => {
            setProducts(products => {
              const newProducts = { ...products };
              newProducts[id] = quantity;
              return newProducts;
            });
          },
        });
      },
      leftSide: {
        label: name,
        image: {
          source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
          badge: quantity,
        },
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}
