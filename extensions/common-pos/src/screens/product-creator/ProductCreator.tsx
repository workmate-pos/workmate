import { Button, ScrollView, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useCreateProductMutation } from '@work-orders/common/queries/use-create-product-mutation.js';
import { useState } from 'react';
import { CreateProduct, Int } from '@web/schemas/generated/create-product.js';
import { useForm } from '@teifi-digital/pos-tools/form';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { FormMoneyField } from '@teifi-digital/pos-tools/form/components/FormMoneyField.js';
import { FormDecimalField, roundingPostProcessor } from '@teifi-digital/pos-tools/form/components/FormDecimalField.js';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useCreateProductReducer } from './reducer.js';
import { UseRouter } from '../router.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export type CreatedProduct = {
  shopifyOrderLineItem: null;
  productVariantId: ID;
  availableQuantity: Int;
  quantity: Int;
  unitCost: Money;
};

export type ProductCreatorProps = {
  initialProduct: Partial<CreateProduct>;
  onCreate: (product: CreatedProduct) => void;
  useRouter: UseRouter;
};

export function ProductCreator({ initialProduct, onCreate, useRouter }: ProductCreatorProps) {
  const [createProduct, dispatch, hasUnsavedChanges] = useCreateProductReducer(initialProduct);
  const [quantity, setQuantity] = useState<Int>(1 as Int);
  const { Form, isValid } = useForm();

  const router = useRouter();

  const fetch = useAuthenticatedFetch();
  const createProductMutation = useCreateProductMutation(
    { fetch },
    {
      onSuccess: ({ product }) => {
        let unitCost = BigDecimal.ZERO.toMoney();

        if (product.variant.inventoryItem.unitCost) {
          unitCost = BigDecimal.fromDecimal(product.variant.inventoryItem.unitCost.amount).toMoney();
        }

        onCreate({
          shopifyOrderLineItem: null,
          productVariantId: product.variant.id,
          availableQuantity: 0 as Int,
          quantity,
          unitCost,
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
              required
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
              label={'Selection Quantity'}
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
