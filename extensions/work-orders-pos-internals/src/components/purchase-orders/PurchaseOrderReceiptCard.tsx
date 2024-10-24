import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { DetailedPurchaseOrder } from '@web/services/purchase-orders/types.js';
import { ReactNode } from 'react';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { Banner, Button, Section, Selectable, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useRouter } from '../../routes.js';

type PurchaseOrderReceipt = DetailedPurchaseOrder['receipts'][number];

type PurchaseOrderReceiptCardSlot = ReactNode | ((receipt: PurchaseOrderReceipt) => ReactNode);
const renderPurchaseOrderReceiptCardSlot = (slot: PurchaseOrderReceiptCardSlot, receipt: PurchaseOrderReceipt) =>
  typeof slot === 'function' ? slot(receipt) : slot;

export function PurchaseOrderReceiptCard({
  name,
  id,
  disabled,
  onClick,
  content,
  right,
}: {
  name: string;
  id: number;
  disabled?: boolean;
  onClick?: () => void;
  content?: PurchaseOrderReceiptCardSlot;
  right?: PurchaseOrderReceiptCardSlot;
}) {
  const fetch = useAuthenticatedFetch();

  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name });

  if (purchaseOrderQuery.isError) {
    return (
      <Banner title="Error loading receipt" variant="error" visible action="Retry" onPress={purchaseOrderQuery.refetch}>
        {extractErrorMessage(purchaseOrderQuery.error, 'An error occurred while loading receipt.')}
      </Banner>
    );
  }

  if (!purchaseOrderQuery.data) {
    // very nice
    return <Button title="" isLoading />;
  }

  const receipt = purchaseOrderQuery.data.receipts.find(receipt => receipt.id === id);

  if (!receipt) {
    return <Banner title="Receipt not found" variant="error" visible hideAction></Banner>;
  }

  return (
    <Selectable onPress={onClick ?? (() => {})} disabled={disabled}>
      <Stack
        direction="horizontal"
        spacing={2}
        alignment="space-between"
        paddingVertical="Small"
        paddingHorizontal="Small"
      >
        <Stack direction="vertical" spacing={0.5}>
          <Text variant="headingSmall">{receipt.name}</Text>
          <Text variant="captionMedium" color="TextSubdued">
            {receipt.description}
          </Text>

          {renderPurchaseOrderReceiptCardSlot(content, receipt)}
        </Stack>

        {renderPurchaseOrderReceiptCardSlot(right, receipt)}
      </Stack>
    </Selectable>
  );
}

/**
 * A purchase order receipt card that opens a modal when clicked.
 */
export function ConfigurablePurchaseOrderReceiptCard({
  name,
  id,
  right,
  content,
  disabled,
}: {
  name: string;
  id: number;
  right?: PurchaseOrderReceiptCardSlot;
  content?: PurchaseOrderReceiptCardSlot;
  disabled?: boolean;
}) {
  const router = useRouter();

  return (
    <PurchaseOrderReceiptCard
      name={name}
      id={id}
      right={right}
      content={content}
      disabled={disabled}
      onClick={() => router.push('PurchaseOrderReceipt', { name, id })}
    />
  );
}
