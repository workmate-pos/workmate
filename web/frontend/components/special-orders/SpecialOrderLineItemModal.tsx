import { FormLayout, Modal, TextField } from '@shopify/polaris';
import { CreateSpecialOrder } from '@web/schemas/generated/create-special-order.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useState } from 'react';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { sum } from '@teifi-digital/shopify-app-toolbox/array';

export function SpecialOrderLineItemModal({
  open,
  onClose,
  onSave,
  onRemove,
  specialOrderName,
  lineItem: initialLineItem,
}: {
  open: boolean;
  onClose: () => void;
  specialOrderName: string | null;
  lineItem: CreateSpecialOrder['lineItems'][number];
  onSave: (lineItem: CreateSpecialOrder['lineItems'][number]) => void;
  onRemove: () => void;
}) {
  const [lineItem, setLineItem] = useState(initialLineItem);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const specialOrderQuery = useSpecialOrderQuery({ fetch, name: specialOrderName });
  const productVariantQuery = useProductVariantQuery({ fetch, id: lineItem.productVariantId });

  const specialOrder = specialOrderQuery.data;
  const productVariant = productVariantQuery.data;

  const label = productVariantQuery.isLoading
    ? 'Loading...'
    : getProductVariantName(productVariant) ?? 'Unknown product';

  const specialOrderLineItem = specialOrder?.lineItems.find(hasPropertyValue('uuid', lineItem.uuid));
  const minQuantity = Math.max(
    1,
    sum(specialOrderLineItem?.purchaseOrderLineItems.map(lineItem => lineItem.quantity) ?? []),
  );
  const maxQuantity = specialOrderLineItem?.shopifyOrderLineItem?.quantity ?? Infinity;

  return (
    <Modal
      open={open}
      title={label}
      onClose={onClose}
      loading={specialOrderQuery.isLoading || productVariantQuery.isLoading}
      primaryAction={{
        content: 'Save',
        onAction: () => {
          onSave(lineItem);
          setToastAction({ content: 'Saved line item' });
          onClose();
        },
      }}
      secondaryActions={[
        {
          content: 'Remove',
          destructive: true,
          onAction: () => {
            onRemove();
            setToastAction({ content: 'Removed line item' });
            onClose();
          },
        },
      ]}
    >
      <Modal.Section>
        <FormLayout>
          <TextField
            label={'Quantity'}
            autoComplete="off"
            type="number"
            min={minQuantity}
            max={maxQuantity}
            value={lineItem.quantity.toString()}
            onChange={value => {
              if (Number.isFinite(Number(value))) {
                setLineItem({ ...lineItem, quantity: Math.min(maxQuantity, Math.max(minQuantity, Number(value))) });
              }
            }}
          />
        </FormLayout>
      </Modal.Section>

      {toast}
    </Modal>
  );
}
