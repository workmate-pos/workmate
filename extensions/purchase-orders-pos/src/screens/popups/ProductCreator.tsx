import { useCreateProductReducer } from '../../create-product/reducer.js';
import { useUnsavedChangesDialog } from '@work-orders/common-pos/hooks/use-unsaved-changes-dialog.js';
import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { ResponsiveGrid } from '@work-orders/common-pos/components/ResponsiveGrid.js';
import { useAuthenticatedFetch } from '@work-orders/common-pos/hooks/use-authenticated-fetch.js';
import { useCreateProductMutation } from '@work-orders/common/queries/use-create-product-mutation.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useState } from 'react';
import { Int } from '@web/schemas/generated/create-product.js';
import { useForm } from '@work-orders/common-pos/hooks/use-form.js';
import { StringField, stringLengthValidator } from '@work-orders/common-pos/components/StringField.js';
import { MoneyField } from '@work-orders/common-pos/components/MoneyField.js';
import { NewMoneyField } from '@work-orders/common-pos/components/NewMoneyField.js';
import { IntField } from '@work-orders/common-pos/components/IntField.js';
import type { CreatePurchaseOrder, Product } from '@web/schemas/generated/create-purchase-order.js';
import { NonNullableValues } from '../../types.js';
import { useScreen } from '@work-orders/common-pos/router/controllable-screen.js';

export function ProductCreator({
  initialProduct: { vendorName, locationId },
  onCreate,
}: {
  initialProduct: NonNullableValues<Pick<CreatePurchaseOrder, 'locationId' | 'vendorName'>>;
  onCreate: (product: Product) => void;
}) {
  const [createProduct, dispatch, hasUnsavedChanges] = useCreateProductReducer({
    locationId,
    vendor: vendorName,
  });
  const [quantity, setQuantity] = useState<Int>(1 as Int);
  const { Form, isValid } = useForm();

  const fetch = useAuthenticatedFetch();
  const createProductMutation = useCreateProductMutation(
    { fetch },
    {
      onSuccess: ({ product }) =>
        onCreate({
          name: getProductVariantName(product.variant) ?? 'Unknown product',
          inventoryItemId: product.variant.inventoryItem.id,
          handle: product.variant.product.handle,
          productVariantId: product.variant.id,
          availableQuantity: 0 as Int,
          sku: product.variant.sku,
          quantity,
        }),
    },
  );

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  const screen = useScreen();
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  return (
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
              required={true}
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
            <NewMoneyField
              label={'Price'}
              value={createProduct.price}
              onChange={price => dispatch.setPartial({ price: price ?? createProduct.price })}
              required={true}
            />
            <NewMoneyField
              label={'Cost'}
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
  );
}
