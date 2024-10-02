import { Button, ScrollView, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { useCreateProductMutation } from '@work-orders/common/queries/use-create-product-mutation.js';
import { useState } from 'react';
import { CreateProduct, Int } from '@web/schemas/generated/create-product.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { Form, useFormContext } from '@teifi-digital/pos-tools/components/form/Form.js';
import { FormMoneyField } from '@teifi-digital/pos-tools/components/form/FormMoneyField.js';
import { FormDecimalField, roundingPostProcessor } from '@teifi-digital/pos-tools/components/form/FormDecimalField.js';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useCreateProductReducer } from './reducer.js';
import { UseRouter } from '../router.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import {
  FIXED_PRICE_SERVICE,
  getProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
} from '@work-orders/common/metafields/product-service-type.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';

export type CreatedProduct = {
  shopifyOrderLineItem: null;
  specialOrderLineItem: null;
  productVariantId: ID;
  availableQuantity: Int;
  quantity: Int;
  unitCost: Money;
  serviceType: typeof FIXED_PRICE_SERVICE | typeof QUANTITY_ADJUSTING_SERVICE | null;
};

export type ProductCreatorProps = {
  initialProduct: Partial<CreateProduct>;
  onCreate: (product: CreatedProduct) => void;
  useRouter: UseRouter;
  service?: boolean;
};

export function ProductCreator({ initialProduct, onCreate, useRouter, service = false }: ProductCreatorProps) {
  const [createProduct, dispatch, hasUnsavedChanges] = useCreateProductReducer({
    ...initialProduct,
    serviceType: service ? FIXED_PRICE_SERVICE : QUANTITY_ADJUSTING_SERVICE,
    costPrice: service ? null : initialProduct.costPrice,
  });

  const [quantity, setQuantity] = useState<Int>(1 as Int);

  const router = useRouter();

  const fetch = useAuthenticatedFetch();
  const createProductMutation = useCreateProductMutation(
    { fetch },
    {
      onSuccess: async ({ product }) => {
        let unitCost = BigDecimal.ZERO.toMoney();

        if (product.variant.inventoryItem.unitCost) {
          unitCost = BigDecimal.fromDecimal(product.variant.inventoryItem.unitCost.amount).toMoney();
        }

        await router.popCurrent();

        onCreate({
          shopifyOrderLineItem: null,
          specialOrderLineItem: null,
          productVariantId: product.variant.id,
          availableQuantity: 0 as Int,
          quantity,
          unitCost,
          serviceType: getProductServiceType(product.variant.product.serviceType?.value),
        });
      },
    },
  );

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  const screen = useScreen();

  const title = `Create ${service ? 'Service' : 'Product'}`;
  screen.setTitle(title);
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  const SaveButton = () => {
    const isValid = useFormContext()?.isValid ?? true;

    return (
      <Button
        title={'Save'}
        type={'primary'}
        onPress={() => createProductMutation.mutate(createProduct)}
        isDisabled={!isValid}
        isLoading={createProductMutation.isPending}
      />
    );
  };

  return (
    <ScrollView>
      <Stack direction={'horizontal'} alignment={'center'}>
        <Text variant={'headingLarge'}>{title}</Text>
      </Stack>

      <Stack direction={'vertical'} paddingVertical={'ExtraLarge'}>
        <Form disabled={createProductMutation.isPending}>
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
            {createProduct.serviceType !== QUANTITY_ADJUSTING_SERVICE && (
              <FormMoneyField
                label={'Price'}
                value={createProduct.price}
                onChange={price => dispatch.setPartial({ price: price ?? createProduct.price })}
                required
              />
            )}
            {!service && (
              <FormMoneyField
                label={'Cost'}
                value={createProduct.costPrice}
                onChange={costPrice => dispatch.setPartial({ costPrice })}
              />
            )}
            <FormDecimalField
              label={'Selection Quantity'}
              value={BigDecimal.fromString(String(quantity)).toDecimal()}
              onChange={decimal => setQuantity(current => (decimal ? (Number(decimal) as Int) : current))}
              postprocessor={roundingPostProcessor(0)}
              inputMode={'numeric'}
            />

            {service && createProduct.serviceType && (
              <FormButton
                title={createProduct.serviceType}
                onPress={() => {
                  if (!createProduct.serviceType) {
                    return;
                  }

                  const newServiceType = (
                    {
                      [QUANTITY_ADJUSTING_SERVICE]: FIXED_PRICE_SERVICE,
                      [FIXED_PRICE_SERVICE]: QUANTITY_ADJUSTING_SERVICE,
                    } as const
                  )[createProduct.serviceType];

                  const newPrice =
                    newServiceType === QUANTITY_ADJUSTING_SERVICE ? BigDecimal.ONE.toMoney() : createProduct.price;

                  const newCostPrice = newServiceType === QUANTITY_ADJUSTING_SERVICE ? null : createProduct.costPrice;

                  dispatch.setPartial({
                    serviceType: newServiceType,
                    price: newPrice,
                    costPrice: newCostPrice,
                  });
                }}
              />
            )}
          </ResponsiveGrid>
        </Form>
      </Stack>

      <Stack direction={'vertical'} alignment={'center'}>
        <SaveButton />
      </Stack>
    </ScrollView>
  );
}
