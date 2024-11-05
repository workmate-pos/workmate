import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { usePurchaseOrderQuery } from '@work-orders/common/queries/use-purchase-order-query.js';
import { Banner, Section, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ConfigurablePurchaseOrderReceiptCard } from './PurchaseOrderReceiptCard.js';
import { ReactNode } from 'react';
import { useRouter } from '../../routes.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';

type FormButtonProps = Parameters<typeof FormButton>[0];

export function PurchaseOrderReceipts({
  disabled,
  name,
  action,
}: {
  disabled?: boolean;
  name: string | null;
  action?: ReactNode;
}) {
  const fetch = useAuthenticatedFetch();
  const purchaseOrderQuery = usePurchaseOrderQuery({ fetch, name });

  // TODO: universal-ui - make this header + action thing a component

  return (
    <Stack direction="vertical" spacing={2}>
      <Stack direction="horizontal" alignment="space-between">
        <Text variant="headingLarge">Receipts</Text>

        {action}
      </Stack>

      {purchaseOrderQuery.isError && (
        <Banner
          title="Error loading receipts"
          variant="error"
          action="Retry"
          onPress={purchaseOrderQuery.refetch}
          visible
        >
          {extractErrorMessage(purchaseOrderQuery.error, 'An error occurred while loading receipts.')}
        </Banner>
      )}

      {!purchaseOrderQuery.data?.receipts.length && (
        <Text variant="body" color="TextSubdued">
          No receipts found
        </Text>
      )}

      <Section>
        {purchaseOrderQuery.data?.receipts.map(
          receipt =>
            !!name && (
              <ConfigurablePurchaseOrderReceiptCard disabled={disabled} name={name} key={receipt.id} id={receipt.id} />
            ),
        )}
      </Section>
    </Stack>
  );
}

export function BaseNewPurchaseOrderReceiptButton(props: Partial<FormButtonProps>) {
  return <FormButton type="plain" title="New receipt" {...props} />;
}

export function NewPurchaseOrderReceiptButton({
  name,
  disabled,
  props,
}: {
  name: string;
  disabled?: boolean;
  props?: Omit<Partial<FormButtonProps>, 'disabled' | 'onClick'>;
}) {
  const router = useRouter();

  return (
    <BaseNewPurchaseOrderReceiptButton
      {...props}
      disabled={disabled}
      onPress={() => router.push('PurchaseOrderReceipt', { name, id: null })}
    />
  );
}
