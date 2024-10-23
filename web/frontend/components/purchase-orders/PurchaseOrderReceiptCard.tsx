import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { Banner, BlockStack, Card, InlineStack, Spinner, Text } from '@shopify/polaris';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { DetailedPurchaseOrder } from '@web/services/purchase-orders/types.js';
import { ReactNode, useState } from 'react';
import { PurchaseOrderReceiptModal } from '@web/frontend/components/purchase-orders/modals/PurchaseOrderReceiptModal.js';

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
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name });

  if (purchaseOrderQuery.isError) {
    return (
      <Banner
        title="Error loading receipt"
        tone="critical"
        action={{
          content: 'Retry',
          onAction: purchaseOrderQuery.refetch,
        }}
      >
        {extractErrorMessage(purchaseOrderQuery.error, 'An error occurred while loading receipt.')}
        {toast}
      </Banner>
    );
  }

  if (!purchaseOrderQuery.data) {
    return (
      <Card>
        <Spinner />
        {toast}
      </Card>
    );
  }

  const receipt = purchaseOrderQuery.data.receipts.find(receipt => receipt.id === id);

  if (!receipt) {
    return (
      <Banner title="Receipt not found" tone="critical">
        {toast}
      </Banner>
    );
  }

  return (
    <span
      onClick={() => {
        if (!disabled) {
          onClick?.();
        }
      }}
      style={{ cursor: onClick && !disabled ? 'pointer' : 'default' }}
    >
      <Card>
        <InlineStack gap={'200'} align="space-between">
          <BlockStack gap={'050'}>
            <Text as="p" variant="bodyMd" fontWeight="bold">
              {receipt.name}
            </Text>

            <Text as="p" variant="bodyMd" tone="subdued">
              {receipt.description}
            </Text>

            {renderPurchaseOrderReceiptCardSlot(content, receipt)}
          </BlockStack>

          {renderPurchaseOrderReceiptCardSlot(right, receipt)}
        </InlineStack>

        {toast}
      </Card>
    </span>
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
  onOpenChange,
  disabled,
}: {
  name: string;
  id: number;
  right?: PurchaseOrderReceiptCardSlot;
  content?: PurchaseOrderReceiptCardSlot;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PurchaseOrderReceiptCard
        name={name}
        id={id}
        right={right}
        content={content}
        disabled={disabled}
        onClick={() => setOpen(true)}
      />

      <PurchaseOrderReceiptModal
        open={open}
        onClose={() => {
          setOpen(false);
          onOpenChange?.(false);
        }}
        name={name}
        id={id}
      />
    </>
  );
}
