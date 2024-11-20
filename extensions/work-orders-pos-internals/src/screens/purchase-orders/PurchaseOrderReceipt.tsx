import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { usePurchaseOrderReceiptMutation } from '@work-orders/common/queries/use-purchase-order-receipt-mutation.js';
import { useEffect, useState } from 'react';
import { DetailedPurchaseOrder } from '@web/services/purchase-orders/types.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { Banner, DatePicker, Icon, ScrollView, Stack, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { List } from '../../components/List.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { useRouter } from '../../routes.js';
import { DateTime } from '@web/schemas/generated/create-special-order.js';
import { useDeletePurchaseOrderReceiptMutation } from '@work-orders/common/queries/use-delete-purchase-order-receipt-mutation.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';

type PurchaseOrderReceipt = DetailedPurchaseOrder['receipts'][number];
type PurchaseOrderReceiptStatus = PurchaseOrderReceipt['status'];

const RECEIPT_STATUSES: PurchaseOrderReceiptStatus[] = ['DRAFT', 'ARCHIVED', 'COMPLETED'];

export function PurchaseOrderReceipt({
  purchaseOrderName,
  receiptName,
}: {
  purchaseOrderName: string;
  receiptName: string | null;
}) {
  const fetch = useAuthenticatedFetch();

  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name: purchaseOrderName });
  const purchaseOrderReceiptMutation = usePurchaseOrderReceiptMutation({ fetch });
  const deletePurchaseOrderReceiptMutation = useDeletePurchaseOrderReceiptMutation({ fetch });

  const screen = useScreen();
  screen.setIsLoading(purchaseOrderQuery.isLoading);
  screen.setTitle(receiptName ?? 'New Purchase Order Receipt');

  const [status, setStatus] = useState<PurchaseOrderReceipt['status']>();
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<PurchaseOrderReceipt['lineItems']>([]);
  const [receivedAt, setReceivedAt] = useState<Date>(new Date());

  const [receipt, setReceipt] = useState<PurchaseOrderReceipt>();

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    const unsatisfiedLineItems =
      purchaseOrderQuery.data?.lineItems
        .map(lineItem => {
          const availableQuantity =
            purchaseOrderQuery.data?.receipts
              .filter(receipt => receipt.name !== receiptName)
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

    if (receiptName === null) {
      setDescription('');
      setStatus(undefined);
      setLineItems(unsatisfiedLineItems);
      setReceivedAt(new Date());
      setReceipt(undefined);
    } else if (purchaseOrderQuery.isSuccess) {
      const receipt = purchaseOrderQuery.data?.receipts.find(receipt => receipt.name === receiptName);

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
  }, [receiptName, purchaseOrderQuery.data]);

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
    receiptName !== null &&
    purchaseOrderQuery.isSuccess &&
    !purchaseOrderQuery.data?.receipts.some(receipt => receipt.name === receiptName);

  if (receiptNotFound) {
    return (
      <ScrollView>
        <Banner title="Receipt not found" hideAction visible variant="error" />
      </ScrollView>
    );
  }

  return (
    <ScrollView>
      <Form disabled={purchaseOrderReceiptMutation.isPending || !router.isCurrent}>
        {!!receiptName && <Text variant="headingLarge">{receiptName}</Text>}

        <FormStringField label="Description" value={description} onChange={setDescription} type="area" />

        <Stack direction="vertical" spacing={1}>
          <FormStringField
            label="Status"
            value={status}
            required
            disabled={receipt?.status === 'COMPLETED'}
            onFocus={() =>
              router.push('ListPopup', {
                title: 'Select status',
                selection: {
                  type: 'select',
                  items: RECEIPT_STATUSES.map(status => ({
                    id: status,
                    leftSide: {
                      label: sentenceCase(status.toLowerCase()),
                    },
                  })),
                  onSelect: status => setStatus(status as PurchaseOrderReceiptStatus),
                },
              })
            }
          />

          {receipt?.status !== 'COMPLETED' && status === 'COMPLETED' && (
            <Stack direction="horizontal" spacing={1}>
              <Icon name="circle-alert" />
              <Text variant="body" color="TextWarning">
                Completed receipts cannot be changed
              </Text>
            </Stack>
          )}
        </Stack>

        <FormStringField
          label="Received at"
          value={receivedAt.toLocaleDateString()}
          onFocus={() => setIsDatePickerOpen(true)}
        />

        <DatePicker
          inputMode={'spinner'}
          visibleState={[isDatePickerOpen, setIsDatePickerOpen]}
          onChange={(date: string) => setReceivedAt(new Date(date))}
        />

        <List pre={lineItems.length === 0 && <List.EmptyState title="No line items available to add to a receipt" />}>
          {lineItems.map(({ uuid, quantity: selectedQuantity }) => {
            const productVariantId = purchaseOrderQuery.data?.lineItems.find(li => li.uuid === uuid)?.productVariant
              ?.id;

            const productVariant = productVariantQueries[productVariantId ?? '']?.data;

            const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;
            const label = getProductVariantName(productVariant) ?? 'Unknown product';

            const availableQuantity =
              purchaseOrderQuery.data?.receipts
                .filter(receipt => receipt.name !== receiptName)
                .flatMap(receipt => receipt.lineItems)
                .filter(hasPropertyValue('uuid', uuid))
                .map(lineItem => lineItem.quantity)
                .reduce((a, b) => a + b, 0) ?? 0;

            const quantity = purchaseOrderQuery.data?.lineItems.find(hasPropertyValue('uuid', uuid))?.quantity ?? 0;

            const maxQuantity = Math.max(0, quantity - availableQuantity);

            const saveLineItemQuantity = (quantity: number) =>
              setLineItems(current => {
                if (current.some(li => li.uuid === uuid)) {
                  return current.map(li => (li.uuid === uuid ? { ...li, quantity } : li));
                }

                return [...current, { uuid, quantity }];
              });

            return (
              <List.Item
                key={uuid}
                disabled={receipt?.status === 'COMPLETED'}
                onClick={() => {
                  if (!productVariantId) {
                    toast.show('Product variant id not found');
                    return;
                  }

                  router.push('PurchaseOrderReceiptLineItemStepper', {
                    productVariantId,
                    initialQuantity: selectedQuantity,
                    min: 0,
                    max: maxQuantity,
                    onChange: quantity => saveLineItemQuantity(quantity),
                  });
                }}
              >
                <List.Item.Left
                  title={label}
                  subtitle={productVariant?.sku ?? undefined}
                  imageUrl={imageUrl}
                  alwaysShowImage
                />

                <Stack direction="horizontal" alignment="flex-end">
                  <Text color={receipt?.status !== 'COMPLETED' ? 'TextInteractive' : undefined}>
                    {selectedQuantity}
                  </Text>
                </Stack>
              </List.Item>
            );
          })}
        </List>

        <Stack direction="horizontal" spacing={2}>
          <FormButton
            title="Delete"
            type="destructive"
            disabled={!receipt || receipt.status === 'COMPLETED'}
            loading={deletePurchaseOrderReceiptMutation.isPending}
            onPress={() => {
              if (!receipt) {
                return;
              }

              deletePurchaseOrderReceiptMutation.mutate(
                { purchaseOrderName, receiptName: receipt.name },
                {
                  onSuccess() {
                    toast.show('Purchase order receipt deleted');
                    router.popCurrent();
                  },
                },
              );
            }}
          />

          <FormButton
            title={receiptName === null ? 'Create receipt' : 'Save receipt'}
            action="submit"
            disabled={!status || !lineItems.filter(li => li.quantity > 0).length || !purchaseOrderQuery.isSuccess}
            loading={purchaseOrderReceiptMutation.isPending}
            onPress={() => {
              if (!status) {
                return;
              }

              purchaseOrderReceiptMutation.mutate(
                {
                  purchaseOrderName,
                  name: receiptName,
                  status,
                  description,
                  lineItems: receipt?.status === 'COMPLETED' ? [] : lineItems.filter(li => li.quantity > 0),
                  receivedAt: receivedAt.toISOString() as DateTime,
                },
                {
                  onSuccess() {
                    toast.show('Saved purchase order receipt');
                    router.popCurrent();
                  },
                },
              );
            }}
          />
        </Stack>
      </Form>
    </ScrollView>
  );
}
