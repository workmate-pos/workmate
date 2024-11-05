import { Banner, BlockStack, Button, ButtonProps, InlineStack, Text } from '@shopify/polaris';
import { ReactNode, useState } from 'react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ConfigurablePurchaseOrderReceiptCard } from '@web/frontend/components/purchase-orders/PurchaseOrderReceiptCard.js';
import { PlusMinor } from '@shopify/polaris-icons';
import { PurchaseOrderReceiptModal } from '@web/frontend/components/purchase-orders/modals/PurchaseOrderReceiptModal.js';

export function PurchaseOrderReceipts({
  action,
  disabled,
  purchaseOrderName,
}: {
  action?: ReactNode;
  disabled?: boolean;
  purchaseOrderName: string | null;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name: purchaseOrderName });

  return (
    <BlockStack gap={'400'}>
      <InlineStack gap={'200'} align={'space-between'}>
        <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
          Receipts
        </Text>

        {action}
      </InlineStack>

      {purchaseOrderQuery.isError && (
        <Banner
          title="Error loading receipts"
          tone="critical"
          action={{
            content: 'Retry',
            onAction: purchaseOrderQuery.refetch,
          }}
        >
          {extractErrorMessage(purchaseOrderQuery.error, 'An error occurred while loading receipts.')}
        </Banner>
      )}

      {!purchaseOrderQuery.data?.receipts.length && (
        <Text as="p" variant="bodyMd" tone="subdued">
          No receipts found
        </Text>
      )}

      {purchaseOrderQuery.data?.receipts.map(
        receipt =>
          !!purchaseOrderName && (
            <ConfigurablePurchaseOrderReceiptCard
              key={receipt.name}
              disabled={disabled}
              purchaseOrderName={purchaseOrderName}
              receiptName={receipt.name}
            />
          ),
      )}

      {toast}
    </BlockStack>
  );
}

export function BaseNewPurchaseOrderReceiptButton(props: Partial<ButtonProps>) {
  return <Button icon={PlusMinor} variant={'plain'} children={'New receipt'} {...props} />;
}

export function NewPurchaseOrderReceiptButton({
  purchaseOrderName,
  disabled,
  props,
}: {
  purchaseOrderName: string;
  disabled?: boolean;
  props?: Omit<Partial<ButtonProps>, 'disabled' | 'onClick'>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <BaseNewPurchaseOrderReceiptButton {...props} disabled={disabled} onClick={() => setOpen(true)} />
      <PurchaseOrderReceiptModal
        open={open}
        onClose={() => setOpen(false)}
        purchaseOrderName={purchaseOrderName}
        receiptName={null}
      />
    </>
  );
}
