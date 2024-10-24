import { Banner, BlockStack, Button, InlineStack, Text } from '@shopify/polaris';
import { useState } from 'react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ConfigurablePurchaseOrderReceiptCard } from '@web/frontend/components/purchase-orders/PurchaseOrderReceiptCard.js';
import { PlusMinor } from '@shopify/polaris-icons';
import { PurchaseOrderReceiptModal } from '@web/frontend/components/purchase-orders/modals/PurchaseOrderReceiptModal.js';
export function PurchaseOrderReceipts({ action, disabled, name, }) {
    var _a, _b;
    const [toast, setToastAction] = useToast();
    const fetch = useAuthenticatedFetch({ setToastAction });
    const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name });
    return (<BlockStack gap={'400'}>
      <InlineStack gap={'200'} align={'space-between'}>
        <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
          Receipts
        </Text>

        {action}
      </InlineStack>

      {purchaseOrderQuery.isError && (<Banner title="Error loading receipts" tone="critical" action={{
                content: 'Retry',
                onAction: purchaseOrderQuery.refetch,
            }}>
          {extractErrorMessage(purchaseOrderQuery.error, 'An error occurred while loading receipts.')}
        </Banner>)}

      {!((_a = purchaseOrderQuery.data) === null || _a === void 0 ? void 0 : _a.receipts.length) && (<Text as="p" variant="bodyMd" tone="subdued">
          No receipts found
        </Text>)}

      {(_b = purchaseOrderQuery.data) === null || _b === void 0 ? void 0 : _b.receipts.map(receipt => !!name && (<ConfigurablePurchaseOrderReceiptCard disabled={disabled} name={name} key={receipt.id} id={receipt.id}/>))}

      {toast}
    </BlockStack>);
}
export function BaseNewPurchaseOrderReceiptButton(props) {
    return (<Button icon={PlusMinor} variant={'plain'} {...props}>
      New receipt
    </Button>);
}
export function NewPurchaseOrderReceiptButton({ name, disabled }) {
    const [open, setOpen] = useState(false);
    return (<>
      <BaseNewPurchaseOrderReceiptButton disabled={disabled} onClick={() => setOpen(true)}/>
      <PurchaseOrderReceiptModal open={open} onClose={() => setOpen(false)} name={name} id={null}/>
    </>);
}
