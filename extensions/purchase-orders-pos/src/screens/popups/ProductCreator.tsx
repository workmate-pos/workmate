import { useCreateProductReducer } from '../../create-product/reducer.js';
import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useCreateProductMutation } from '@work-orders/common/queries/use-create-product-mutation.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useState } from 'react';
import { Int } from '@web/schemas/generated/create-product.js';
import type { CreatePurchaseOrder, Product } from '@web/schemas/generated/create-purchase-order.js';
import { NonNullableValues } from '../../types.js';
import { useForm } from '@teifi-digital/pos-tools/form';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { FormMoneyField } from '@teifi-digital/pos-tools/form/components/FormMoneyField.js';
import { FormDecimalField, roundingPostProcessor } from '@teifi-digital/pos-tools/form/components/FormDecimalField.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { stringLengthValidator } from '../../util/string-length-validator.js';
import { useRouter } from '../../routes.js';

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
  const router = useRouter();
  const createProductMutation = useCreateProductMutation(
    { fetch },
    {
      onSuccess: ({ product }) => {
        onCreate({
          name: getProductVariantName(product.variant) ?? 'Unknown product',
          inventoryItemId: product.variant.inventoryItem.id,
          handle: product.variant.product.handle,
          productVariantId: product.variant.id,
          availableQuantity: 0 as Int,
          sku: product.variant.sku,
          quantity,
        });
        router.popCurrent();
      },
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
            <FormStringField
              label={'Title'}
              value={createProduct.title ?? ''}
              onChange={(value: string) => dispatch.setPartial({ title: value })}
              validator={stringLengthValidator({ min: 1 })}
              required={true}
            />
            <FormStringField
              label={'SKU'}
              value={createProduct.sku ?? ''}
              onChange={(value: string) => dispatch.setPartial({ sku: value || null })}
            />
            <FormStringField
              label={'Barcode'}
              value={createProduct.barcode ?? ''}
              onChange={(value: string) => dispatch.setPartial({ barcode: value || null })}
            />
            <FormStringField
              label={'Product Type'}
              value={createProduct.productType ?? ''}
              onChange={(value: string) => dispatch.setPartial({ productType: value || null })}
            />
            <FormMoneyField
              label={'Price'}
              value={createProduct.price}
              onChange={price => dispatch.setPartial({ price: price ?? createProduct.price })}
              required
            />
            <FormMoneyField
              label={'Cost'}
              value={createProduct.costPrice}
              onChange={costPrice => dispatch.setPartial({ costPrice })}
            />
            <FormDecimalField
              label={'PO Quantity'}
              value={BigDecimal.fromString(String(quantity)).toDecimal()}
              onChange={decimal => setQuantity(current => (decimal ? (Number(decimal) as Int) : current))}
              postprocessor={roundingPostProcessor(0)}
              inputMode={'numeric'}
            />
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
