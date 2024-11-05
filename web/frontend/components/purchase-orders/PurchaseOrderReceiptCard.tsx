import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { Badge, Banner, BlockStack, Box, Card, InlineStack, Spinner, Text } from '@shopify/polaris';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { DetailedPurchaseOrder } from '@web/services/purchase-orders/types.js';
import { ReactNode, useState } from 'react';
import { PurchaseOrderReceiptModal } from '@web/frontend/components/purchase-orders/modals/PurchaseOrderReceiptModal.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';

type PurchaseOrderReceipt = DetailedPurchaseOrder['receipts'][number];

type PurchaseOrderReceiptCardSlot = ReactNode | ((receipt: PurchaseOrderReceipt) => ReactNode);
const renderPurchaseOrderReceiptCardSlot = (slot: PurchaseOrderReceiptCardSlot, receipt: PurchaseOrderReceipt) =>
  typeof slot === 'function' ? slot(receipt) : slot;

export function PurchaseOrderReceiptCard({
  purchaseOrderName,
  receiptName,
  disabled,
  onClick,
  content,
}: {
  purchaseOrderName: string;
  receiptName: string | null;
  disabled?: boolean;
  onClick?: () => void;
  content?: PurchaseOrderReceiptCardSlot;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name: purchaseOrderName });

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

  const receipt = purchaseOrderQuery.data.receipts.find(receipt => receipt.name === receiptName);

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

          <Box>
            <Badge tone={({ DRAFT: 'info', ARCHIVED: 'warning', COMPLETED: 'success' } as const)[receipt.status]}>
              {sentenceCase(receipt.status.toLowerCase())}
            </Badge>
          </Box>
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
  purchaseOrderName,
  receiptName,
  content,
  onOpenChange,
  disabled,
}: {
  purchaseOrderName: string;
  receiptName: string | null;
  content?: PurchaseOrderReceiptCardSlot;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PurchaseOrderReceiptCard
        purchaseOrderName={purchaseOrderName}
        receiptName={receiptName}
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
        purchaseOrderName={purchaseOrderName}
        receiptName={receiptName}
      />
    </>
  );
}
