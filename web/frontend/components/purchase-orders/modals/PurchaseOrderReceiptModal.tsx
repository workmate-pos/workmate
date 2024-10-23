import {
  Badge,
  Banner,
  BlockStack,
  Box,
  FormLayout,
  InlineGrid,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  SkeletonThumbnail,
  Text,
  TextField,
  Thumbnail,
} from '@shopify/polaris';
import { usePurchaseOrderReceiptMutation } from '@work-orders/common/queries/use-purchase-order-receipt-mutation.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { useEffect, useState } from 'react';
import { DetailedPurchaseOrder } from '@web/services/purchase-orders/types.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { UUID } from '@work-orders/common/util/uuid.js';

type PurchaseOrderReceipt = DetailedPurchaseOrder['receipts'][number];

export function PurchaseOrderReceiptModal({
  open,
  onClose,
  name,
  id,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  /**
   * If null, this modal is creating a receipt.
   */
  id: number | null;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name });
  const purchaseOrderReceiptMutation = usePurchaseOrderReceiptMutation({ fetch });

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

  if (purchaseOrderQuery.isError) {
    return (
      <>
        <Modal title={'Purchase Order Receipt'} open={open} onClose={onClose}>
          <Modal.Section>
            <Banner
              title="Error loading purchase order"
              action={{
                content: 'Retry',
                onAction: purchaseOrderQuery.refetch,
              }}
            >
              {extractErrorMessage(purchaseOrderQuery.error, 'An error occurred while loading purchase order')}
            </Banner>
          </Modal.Section>
        </Modal>

        {toast}
      </>
    );
  }

  const receiptNotFound =
    id !== null &&
    purchaseOrderQuery.isSuccess &&
    !purchaseOrderQuery.data?.receipts.some(receipt => receipt.id === id);

  if (receiptNotFound) {
    return (
      <>
        <Modal title={'Purchase Order Receipt'} open={open} onClose={onClose}>
          <Modal.Section>
            <Text as="p" variant="bodyMd" fontWeight="bold" tone="critical">
              Receipt not found
            </Text>
          </Modal.Section>
        </Modal>

        {toast}
      </>
    );
  }

  return (
    <>
      <Modal
        title={'Purchase Order Receipt'}
        open={open}
        onClose={onClose}
        loading={purchaseOrderQuery.isPending}
        primaryAction={{
          content: 'Save',
          disabled: !receiptName || !lineItems.length || !purchaseOrderQuery.isSuccess,
          loading: purchaseOrderReceiptMutation.isPending,
          onAction: () =>
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
                  setToastAction({ content: 'Saved purchase order receipt' });
                  onClose();
                },
              },
            ),
        }}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label={'Name'}
              autoComplete="off"
              value={receiptName}
              onChange={setReceiptName}
              requiredIndicator
            />

            <TextField
              label={'Description'}
              autoComplete="off"
              multiline
              value={description}
              onChange={setDescription}
            />

            <BlockStack gap={'100'}>
              <Text as="p" variant="bodyMd" fontWeight="bold">
                Line items
              </Text>

              {/*TODO: Loop through line items*/}
              <ResourceList
                items={lineItems}
                resourceName={{ singular: 'line item', plural: 'line items' }}
                emptyState={
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No line items available to add to a receipt
                  </Text>
                }
                renderItem={({ uuid, quantity: selectedQuantity }) => {
                  const productVariantId = purchaseOrderQuery.data?.lineItems.find(li => li.uuid === uuid)
                    ?.productVariant?.id;

                  const productVariant = productVariantQueries[productVariantId ?? '']?.data;

                  const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;
                  const label = getProductVariantName(productVariant) ?? 'Unknown product';

                  const availableQuantity =
                    purchaseOrderQuery.data?.receipts
                      .flatMap(receipt => receipt.lineItems)
                      .filter(hasPropertyValue('uuid', uuid))
                      .map(lineItem => lineItem.quantity)
                      .reduce((a, b) => a + b, 0) ?? 0;

                  const quantity =
                    purchaseOrderQuery.data?.lineItems.find(hasPropertyValue('uuid', uuid))?.quantity ?? 0;

                  const maxQuantity = Math.max(0, quantity - availableQuantity);

                  const saveLineItemQuantity = (quantity: number) => {
                    setLineItems(current =>
                      [...current.filter(x => x.uuid !== uuid), { uuid, quantity }].filter(isNonNullable),
                    );
                  };

                  return (
                    <ResourceItem
                      id={uuid}
                      disabled={id !== null}
                      onClick={() => saveLineItemQuantity(selectedQuantity === 0 ? maxQuantity : 0)}
                    >
                      <InlineGrid gap={'200'} columns={['twoThirds', 'oneThird']}>
                        <InlineStack gap={'400'} wrap={false} blockAlign="center">
                          <Box>
                            <Badge tone="info">{selectedQuantity.toString()}</Badge>
                          </Box>
                          {imageUrl && <Thumbnail source={imageUrl} alt={label} />}
                          {!imageUrl && <SkeletonThumbnail />}
                          <BlockStack gap={'200'}>
                            <Text as="p" variant="bodyMd" fontWeight="bold">
                              {label}
                            </Text>
                            <Text as="p" variant="bodyMd" tone="subdued">
                              {productVariant?.sku}
                            </Text>
                          </BlockStack>
                        </InlineStack>

                        {id === null && (
                          <span onClick={event => event.stopPropagation()}>
                            <TextField
                              label="Quantity"
                              autoComplete="off"
                              type="number"
                              labelAction={
                                maxQuantity === 0
                                  ? undefined
                                  : selectedQuantity !== maxQuantity
                                    ? {
                                        content: 'Max',
                                        onAction: () => saveLineItemQuantity(maxQuantity),
                                      }
                                    : {
                                        content: 'Clear',
                                        onAction: () => saveLineItemQuantity(0),
                                      }
                              }
                              min={0}
                              max={maxQuantity}
                              value={selectedQuantity.toString()}
                              onChange={value => {
                                if (!!value && Number.isFinite(Number(value)) && Math.round(Number(value)) >= 0) {
                                  saveLineItemQuantity(Math.round(Number(value)));
                                }
                              }}
                              onBlur={() => saveLineItemQuantity(Math.max(0, Math.min(maxQuantity, selectedQuantity)))}
                            />
                          </span>
                        )}
                      </InlineGrid>
                    </ResourceItem>
                  );
                }}
              />
            </BlockStack>
          </FormLayout>
        </Modal.Section>
      </Modal>

      {toast}
    </>
  );
}
