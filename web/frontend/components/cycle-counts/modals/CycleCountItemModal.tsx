import { Modal, Text, BlockStack, InlineStack, Badge, BadgeProps } from '@shopify/polaris';
import { CreateCycleCountItem } from '@web/schemas/generated/create-cycle-count.js';
import { useState } from 'react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useCycleCountQuery } from '@work-orders/common/queries/use-cycle-count-query.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { IntegerField } from '@web/frontend/components/IntegerField.js';
import { CycleCountApplicationStatus } from '@web/services/cycle-count/types.js';
import { useToast } from '@teifi-digital/shopify-app-react';

type Props = {
  open: boolean;
  onClose: () => void;
  item: CreateCycleCountItem;
  cycleCountName: string | null;
  onSave: (item: CreateCycleCountItem) => void;
  onRemove: () => void;
};

export function CycleCountItemModal({ open, onClose, item: initialItem, cycleCountName, onSave, onRemove }: Props) {
  const [toast, setToastAction] = useToast();
  const [item, setItem] = useState(initialItem);

  const fetch = useAuthenticatedFetch({ setToastAction });

  const cycleCountQuery = useCycleCountQuery({ fetch, name: cycleCountName ?? null });
  const productVariantQuery = useProductVariantQuery({ fetch, id: item.productVariantId });

  const productVariant = productVariantQuery.data;
  const cycleCountItem = cycleCountQuery.data?.items.find(
    hasPropertyValue<{ uuid: string }, 'uuid', string>('uuid', item.uuid),
  );

  const productName = getProductVariantName(
    productVariant &&
      'title' in productVariant &&
      typeof productVariant.title === 'string' &&
      'product' in productVariant
      ? {
          title: productVariant.title,
          product: {
            title: 'product' in productVariant ? productVariant.product.title : item.productTitle,
            hasOnlyDefaultVariant: 'product' in productVariant ? productVariant.product.hasOnlyDefaultVariant : false,
          },
        }
      : {
          title: item.productVariantTitle,
          product: { title: item.productTitle, hasOnlyDefaultVariant: false },
        },
  );

  const applicationBadge = getCycleCountApplicationStateBadge(cycleCountItem?.applicationStatus ?? 'not-applied', {
    appliedQuantity: cycleCountItem?.applications.at(-1)?.appliedQuantity ?? 0,
    countQuantity: item.countQuantity,
  });

  const handleSave = () => {
    onSave(item);
    setToastAction({ content: 'Saved item' });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={productName}
      primaryAction={{
        content: 'Save',
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: 'Remove',
          destructive: true,
          onAction: () => {
            onRemove();
            setToastAction({ content: 'Removed item' });
            onClose();
          },
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <InlineStack gap="200">
            <Badge tone="info">{item.countQuantity.toString()}</Badge>
            <Badge tone={applicationBadge.tone}>{applicationBadge.children}</Badge>
          </InlineStack>

          <IntegerField
            label="Count Quantity"
            value={item.countQuantity.toString()}
            onChange={value => setItem({ ...item, countQuantity: Number(value) })}
            min={0}
            requiredIndicator
            autoComplete="off"
          />

          {productVariant?.sku && (
            <Text as="p" variant="bodyMd" tone="subdued">
              {productVariant.sku}
            </Text>
          )}
        </BlockStack>
      </Modal.Section>
      {toast}
    </Modal>
  );
}

export function getCycleCountApplicationStateBadge(
  applicationStatus: CycleCountApplicationStatus,
  quantities?: {
    countQuantity: number;
    appliedQuantity: number;
  },
): BadgeProps {
  const changed = quantities?.appliedQuantity !== quantities?.countQuantity;

  if (applicationStatus === 'not-applied') {
    return { children: 'Not applied', tone: 'warning', progress: 'incomplete' };
  }

  if (applicationStatus === 'partially-applied' || (applicationStatus === 'applied' && changed)) {
    let text = 'Partially applied';

    if (quantities) {
      text += ` (${quantities.appliedQuantity})`;
    }

    return { children: text, tone: 'warning', progress: 'partiallyComplete' };
  }

  if (applicationStatus === 'applied') {
    return { children: 'Applied', tone: 'success', progress: 'complete' };
  }

  return applicationStatus satisfies never;
}
