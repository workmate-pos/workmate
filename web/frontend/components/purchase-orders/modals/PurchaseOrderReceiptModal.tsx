import {
  Badge,
  Banner,
  BlockStack,
  Box,
  FormLayout,
  Icon,
  InlineGrid,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Select,
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
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { DateTime } from '@web/schemas/generated/upsert-purchase-order-receipt.js';
import { DateTimeField } from '@web/frontend/components/form/DateTimeField.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { AlertMinor } from '@shopify/polaris-icons';
import { useDeletePurchaseOrderReceiptMutation } from '@work-orders/common/queries/use-delete-purchase-order-receipt-mutation.js';

type PurchaseOrderReceipt = DetailedPurchaseOrder['receipts'][number];
type PurchaseOrderReceiptStatus = PurchaseOrderReceipt['status'];

const RECEIPT_STATUSES: PurchaseOrderReceiptStatus[] = ['DRAFT', 'ARCHIVED', 'COMPLETED'];

function isReceiptStatus(status: string): status is PurchaseOrderReceiptStatus {
  return (RECEIPT_STATUSES as string[]).includes(status);
}

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
  const deletePurchaseOrderReceiptMutation = useDeletePurchaseOrderReceiptMutation({ fetch });

  const [receiptName, setReceiptName] = useState('');
  const [status, setStatus] = useState<PurchaseOrderReceipt['status']>();
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<PurchaseOrderReceipt['lineItems']>([]);
  const [receivedAt, setReceivedAt] = useState<Date>(new Date());

  const [receipt, setReceipt] = useState<PurchaseOrderReceipt>();

  useEffect(() => {
    const unsatisfiedLineItems =
      purchaseOrderQuery.data?.lineItems
        .map(lineItem => {
          const availableQuantity =
            purchaseOrderQuery.data?.receipts
              .filter(receipt => receipt.id !== id)
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
        })) ?? [];

    if (id === null) {
      setReceiptName('');
      setDescription('');
      setStatus(undefined);
      setLineItems(unsatisfiedLineItems);
      setReceivedAt(new Date());
      setReceipt(undefined);
    } else if (purchaseOrderQuery.isSuccess) {
      const receipt = purchaseOrderQuery.data?.receipts.find(receipt => receipt.id === id);

      setReceiptName(receipt?.name ?? '');
      setDescription(receipt?.description ?? '');
      setStatus(receipt?.status);
      setLineItems([
        ...(receipt?.lineItems ?? []),
        ...(receipt?.status === 'COMPLETED'
          ? []
          : unsatisfiedLineItems
              .filter(lineItem => !receipt?.lineItems.some(receiptLineItem => lineItem.uuid === receiptLineItem.uuid))
              .map(lineItem => ({ ...lineItem, quantity: 0 }))),
      ]);
      setReceivedAt(receipt ? new Date(receipt.receivedAt) : new Date());
      setReceipt(receipt);
    }
  }, [id, purchaseOrderQuery.data]);

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
        loading={purchaseOrderQuery.isLoading}
        secondaryActions={[
          {
            content: 'Delete',
            destructive: true,
            disabled: id === null || receipt?.status === 'COMPLETED',
            loading: deletePurchaseOrderReceiptMutation.isPending,
            onAction: () => {
              if (id === null) {
                return;
              }

              deletePurchaseOrderReceiptMutation.mutate(
                { purchaseOrderName: name, id },
                {
                  onSuccess() {
                    setToastAction({ content: 'Purchase order receipt deleted' });
                    onClose();
                  },
                },
              );
            },
          },
        ]}
        primaryAction={{
          content: 'Save',
          disabled:
            !receiptName || !status || !lineItems.filter(li => li.quantity > 0).length || !purchaseOrderQuery.isSuccess,
          loading: purchaseOrderReceiptMutation.isPending,
          onAction: () => {
            if (!status) {
              return;
            }

            purchaseOrderReceiptMutation.mutate(
              {
                purchaseOrderName: name,
                id: id ?? undefined,
                status,
                name: receiptName,
                description,
                lineItems: receipt?.status === 'COMPLETED' ? [] : lineItems.filter(li => li.quantity > 0),
                receivedAt: receivedAt.toISOString() as DateTime,
              },
              {
                onSuccess() {
                  setToastAction({ content: 'Purchase order receipt saved' });
                  onClose();
                },
              },
            );
          },
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

            <BlockStack gap="100">
              <Select
                label="Status"
                placeholder="Select a status"
                id="status"
                disabled={receipt?.status === 'COMPLETED'}
                requiredIndicator
                options={RECEIPT_STATUSES.map(status => ({ label: sentenceCase(status.toLowerCase()), value: status }))}
                onChange={status => {
                  if (isReceiptStatus(status)) {
                    setStatus(status);
                  }
                }}
                value={status}
              />

              {receipt?.status !== 'COMPLETED' && status === 'COMPLETED' && (
                <InlineStack>
                  <InlineStack gap="100" align="start">
                    <Icon source={AlertMinor} tone="caution" />
                    <Text as="p" tone="caution">
                      Completed receipts cannot be changed
                    </Text>
                  </InlineStack>
                </InlineStack>
              )}
            </BlockStack>

            <DateTimeField label="Received at" value={receivedAt} onChange={setReceivedAt} requiredIndicator />

            <BlockStack gap={'100'}>
              <Text as="p" variant="bodyMd" fontWeight="bold">
                Line items
              </Text>

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
                      .filter(receipt => receipt.id !== id)
                      .flatMap(receipt => receipt.lineItems)
                      .filter(hasPropertyValue('uuid', uuid))
                      .map(lineItem => lineItem.quantity)
                      .reduce((a, b) => a + b, 0) ?? 0;

                  const quantity =
                    purchaseOrderQuery.data?.lineItems.find(hasPropertyValue('uuid', uuid))?.quantity ?? 0;

                  const maxQuantity = Math.max(0, quantity - availableQuantity);

                  const saveLineItemQuantity = (quantity: number) =>
                    setLineItems(current => {
                      if (current.some(li => li.uuid === uuid)) {
                        return current.map(li => (li.uuid === uuid ? { ...li, quantity } : li));
                      }

                      return [...current, { uuid, quantity }];
                    });

                  return (
                    <ResourceItem
                      id={uuid}
                      disabled={receipt?.status === 'COMPLETED'}
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

                        {receipt?.status !== 'COMPLETED' && (
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
