import { useScreen } from '@work-orders/common-pos/hooks/use-screen.js';
import { useCreateProductReducer } from '../../create-product/reducer.js';
import { useUnsavedChangesDialog } from '@work-orders/common-pos/hooks/use-unsaved-changes-dialog.js';
import { defaultCreateProduct } from '../../create-product/default.js';
import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ResponsiveGrid } from '@work-orders/common-pos/components/ResponsiveGrid.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { useCreateProductMutation } from '@work-orders/common/queries/use-create-product-mutation.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useState } from 'react';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Int } from '@web/schemas/generated/create-product.js';
import { IntField } from '../../components/IntField.js';
import { MoneyField } from '../../components/MoneyField.js';
import { StringField, stringLengthValidator } from '../../components/StringField.js';
import { useForm } from '@work-orders/common-pos/hooks/use-form.js';

export function ProductCreator() {
  const [createProduct, dispatch, hasUnsavedChanges, setHasUnsavedChanges] = useCreateProductReducer({
    locationId: createGid('Location', 'null'),
    vendor: 'N/A',
  });
  const [quantity, setQuantity] = useState<Int>(1 as Int);
  const { Form, isValid } = useForm();

  const { Screen, closePopup } = useScreen('ProductCreator', ({ locationId, vendorName }) => {
    dispatch.set(defaultCreateProduct({ locationId, vendor: vendorName }));
    setQuantity(1 as Int);
    setHasUnsavedChanges(false);
  });

  const fetch = useAuthenticatedFetch();
  const createProductMutation = useCreateProductMutation(
    { fetch },
    {
      onSuccess: ({ product }) =>
        closePopup({
          productVariantId: product.variant.id,
          name: getProductVariantName(product.variant) ?? 'Unknown product',
          sku: product.variant.sku,
          handle: product.variant.product.handle,
          quantity,
        }),
    },
  );

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  return (
    <Screen title={'Create Product'} presentation={{ sheet: true }} overrideNavigateBack={unsavedChangesDialog.show}>
      <ScrollView>
        <Stack direction={'horizontal'} alignment={'center'}>
          <Text variant={'headingLarge'}>Create Product</Text>
        </Stack>

        <Stack direction={'vertical'} paddingVertical={'ExtraLarge'}>
          <Form disabled={createProductMutation.isLoading}>
            <ResponsiveGrid columns={2}>
              <StringField
                label={'Title'}
                value={createProduct.title ?? ''}
                onChange={(value: string) => dispatch.setPartial({ title: value })}
                validate={stringLengthValidator({ min: 1 })}
              />
              <StringField
                label={'SKU'}
                value={createProduct.sku ?? ''}
                onChange={(value: string) => dispatch.setPartial({ sku: value || null })}
              />
              <StringField
                label={'Barcode'}
                value={createProduct.barcode ?? ''}
                onChange={(value: string) => dispatch.setPartial({ barcode: value || null })}
              />
              <StringField
                label={'Product Type'}
                value={createProduct.productType ?? ''}
                onChange={(value: string) => dispatch.setPartial({ productType: value || null })}
              />
              <MoneyField
                label={'Price'}
                value={createProduct.price}
                allowEmpty={false}
                onChange={price => dispatch.setPartial({ price: price ?? createProduct.price })}
              />
              <MoneyField
                label={'Cost'}
                allowEmpty={true}
                value={createProduct.costPrice}
                onChange={costPrice => dispatch.setPartial({ costPrice })}
              />
              <IntField label={'PO Quantity'} value={quantity} onChange={value => setQuantity(value ?? quantity)} />
            </ResponsiveGrid>
          </Form>
        </Stack>

        <Stack direction={'vertical'} alignment={'center'}>
          <Button
            title={'Save'}
            type={'primary'}
            onPress={() => createProductMutation.mutate(createProduct)}
            isDisabled={!isValid}
            isLoading={createProductMutation.isLoading}
          />
        </Stack>
      </ScrollView>
    </Screen>
  );
}
