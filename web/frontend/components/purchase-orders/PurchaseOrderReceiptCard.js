import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { Banner, BlockStack, Card, InlineStack, Spinner, Text } from '@shopify/polaris';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useState } from 'react';
import { PurchaseOrderReceiptModal } from '@web/frontend/components/purchase-orders/modals/PurchaseOrderReceiptModal.js';
const renderPurchaseOrderReceiptCardSlot = (slot, receipt) => typeof slot === 'function' ? slot(receipt) : slot;
export function PurchaseOrderReceiptCard({ name, id, disabled, onClick, content, right, }) {
    const [toast, setToastAction] = useToast();
    const fetch = useAuthenticatedFetch({ setToastAction });
    const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name });
    if (purchaseOrderQuery.isError) {
        return (<Banner title="Error loading receipt" tone="critical" action={{
                content: 'Retry',
                onAction: purchaseOrderQuery.refetch,
            }}>
        {extractErrorMessage(purchaseOrderQuery.error, 'An error occurred while loading receipt.')}
        {toast}
      </Banner>);
    }
    if (!purchaseOrderQuery.data) {
        return (<Card>
        <Spinner />
        {toast}
      </Card>);
    }
    const receipt = purchaseOrderQuery.data.receipts.find(receipt => receipt.id === id);
    if (!receipt) {
        return (<Banner title="Receipt not found" tone="critical">
        {toast}
      </Banner>);
    }
    return (<span onClick={() => {
            if (!disabled) {
                onClick === null || onClick === void 0 ? void 0 : onClick();
            }
        }} style={{ cursor: onClick && !disabled ? 'pointer' : 'default' }}>
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
    </span>);
}
/**
 * A purchase order receipt card that opens a modal when clicked.
 */
export function ConfigurablePurchaseOrderReceiptCard({ name, id, right, content, onOpenChange, disabled, }) {
    const [open, setOpen] = useState(false);
    return (<>
      <PurchaseOrderReceiptCard name={name} id={id} right={right} content={content} disabled={disabled} onClick={() => setOpen(true)}/>

      <PurchaseOrderReceiptModal open={open} onClose={() => {
            setOpen(false);
            onOpenChange === null || onOpenChange === void 0 ? void 0 : onOpenChange(false);
        }} name={name} id={id}/>
    </>);
}
