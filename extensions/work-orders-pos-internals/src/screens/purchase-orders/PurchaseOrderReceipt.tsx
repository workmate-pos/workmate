import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { usePurchaseOrderReceiptMutation } from '@work-orders/common/queries/use-purchase-order-receipt-mutation.js';
import { useEffect, useState } from 'react';
import { DetailedPurchaseOrder } from '@web/services/purchase-orders/types.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { Banner, Button, ScrollView, Stack, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { List } from '../../components/List.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { useRouter } from '../../routes.js';

type PurchaseOrderReceipt = DetailedPurchaseOrder['receipts'][number];

export function PurchaseOrderReceipt({ name, id }: { name: string; id: number | null }) {
  const fetch = useAuthenticatedFetch();

  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name });
  const purchaseOrderReceiptMutation = usePurchaseOrderReceiptMutation({ fetch });

  const screen = useScreen();
  screen.setIsLoading(purchaseOrderQuery.isLoading);

  const [receiptName, setReceiptName] = useState('');
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<PurchaseOrderReceipt['lineItems']>([]);

  useEffect(() => {
    if (id === null) {
      setReceiptName('');
      setDescription('');
      setLineItems(
        purchaseOrderQuery.data?.lineItems
          .map(lineItem => {
            const availableQuantity =
              purchaseOrderQuery.data?.receipts
                .flatMap(receipt => receipt.lineItems)
                .filter(hasPropertyValue('uuid', lineItem.uuid))
                .map(lineItem => lineItem.quantity)
                .reduce((a, b) => a + b, 0) ?? 0;

            return { ...lineItem, availableQuantity };
          })
          .filter(lineItem => lineItem.quantity > lineItem.availableQuantity)
          .map(({ uuid, quantity, availableQuantity }) => ({
            uuid,
            quantity: Math.max(0, quantity - availableQuantity),
          })) ?? [],
      );
    } else if (purchaseOrderQuery.isSuccess) {
      const receipt = purchaseOrderQuery.data?.receipts.find(receipt => receipt.id === id);

      setReceiptName(receipt?.name ?? '');
      setDescription(receipt?.description ?? '');
      setLineItems(receipt?.lineItems ?? []);
    }
  }, [purchaseOrderQuery.data]);

  const productVariantIds = unique(purchaseOrderQuery.data?.lineItems.map(li => li.productVariant.id) ?? []);
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const { toast } = useApi<'pos.home.modal.render'>();
  const router = useRouter();

  if (purchaseOrderQuery.isError) {
    return (
      <ScrollView>
        <Banner
          title="Error loading purchase order"
          action="Retry"
          onPress={purchaseOrderQuery.refetch}
          visible
          variant="error"
        >
          {extractErrorMessage(purchaseOrderQuery.error, 'An error occurred while loading purchase order')}
        </Banner>
      </ScrollView>
    );
  }

  const receiptNotFound =
    id !== null &&
    purchaseOrderQuery.isSuccess &&
    !purchaseOrderQuery.data?.receipts.some(receipt => receipt.id === id);

  if (receiptNotFound) {
    return (
      <ScrollView>
        <Banner title="Receipt not found" hideAction visible variant="error" />
      </ScrollView>
    );
  }

  return (
    <ScrollView>
      <Form disabled={purchaseOrderReceiptMutation.isPending}>
        <FormStringField label="Name" value={receiptName} onChange={setReceiptName} required />
        <FormStringField label="Description" value={description} onChange={setDescription} type="area" />

        <List pre={lineItems.length === 0 && <List.EmptyState title="No line items available to add to a receipt" />}>
          {lineItems.map(({ uuid, quantity: selectedQuantity }) => {
            const productVariantId = purchaseOrderQuery.data?.lineItems.find(li => li.uuid === uuid)?.productVariant
              ?.id;

            const productVariant = productVariantQueries[productVariantId ?? '']?.data;

            const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;
            const label = getProductVariantName(productVariant) ?? 'Unknown product';

            const availableQuantity =
              purchaseOrderQuery.data?.receipts
                .flatMap(receipt => receipt.lineItems)
                .filter(hasPropertyValue('uuid', uuid))
                .map(lineItem => lineItem.quantity)
                .reduce((a, b) => a + b, 0) ?? 0;

            const quantity = purchaseOrderQuery.data?.lineItems.find(hasPropertyValue('uuid', uuid))?.quantity ?? 0;

            const maxQuantity = Math.max(0, quantity - availableQuantity);

            const saveLineItemQuantity = (quantity: number) => {
              setLineItems(current => [...current.filter(x => x.uuid !== uuid), { uuid, quantity }]);
            };

            // TODO: Just show a number + popup to change it. this shit is ugly

            return (
              <List.Item key={uuid}>
                <List.Item.Left
                  title={label}
                  subtitle={productVariant?.sku ?? undefined}
                  imageUrl={imageUrl}
                  alwaysShowImage
                />

                {id === null && (
                  <Stack direction="horizontal" alignment="flex-end" paddingHorizontal="Small" flexWrap="wrap" flex={0}>
                    {(
                      [
                        ['0', 0],
                        ['-', Math.max(0, selectedQuantity - 1)],
                        [`${selectedQuantity}`, selectedQuantity],
                        ['+', Math.min(maxQuantity, selectedQuantity + 1)],
                        [`${maxQuantity}`, maxQuantity],
                      ] as const
                    ).map(([key, value], i) => (
                      <Button
                        key={i}
                        type={'plain'}
                        onPress={() => saveLineItemQuantity(value)}
                        isDisabled={selectedQuantity === value}
                        title={key}
                      />
                    ))}
                  </Stack>
                )}

                {id !== null && (
                  <Stack direction="horizontal" flex={0} alignment="flex-end">
                    <Text variant="body">{selectedQuantity.toString()}</Text>
                  </Stack>
                )}
              </List.Item>
            );
          })}
        </List>

        <FormButton
          title={id === null ? 'Create receipt' : 'Save receipt'}
          action="submit"
          disabled={!receiptName || !lineItems.filter(li => li.quantity > 0).length || !purchaseOrderQuery.isSuccess}
          loading={purchaseOrderReceiptMutation.isPending}
          onPress={() =>
            purchaseOrderReceiptMutation.mutate(
              {
                purchaseOrderName: name,
                id: id ?? undefined,
                name: receiptName,
                description,
                lineItems: id !== null ? [] : lineItems.filter(li => li.quantity > 0),
              },
              {
                onSuccess() {
                  toast.show('Saved purchase order receipt');
                  router.popCurrent();
                },
              },
            )
          }
        />
      </Form>
    </ScrollView>
  );
}
