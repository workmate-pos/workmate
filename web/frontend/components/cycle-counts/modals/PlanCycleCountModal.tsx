import { Modal, ResourceList, Text, BlockStack, Badge, ResourceItem } from '@shopify/polaris';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCycleCountQuery } from '@work-orders/common/queries/use-cycle-count-query.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useState, useEffect } from 'react';
import { useApplyCycleCountMutation } from '@work-orders/common/queries/use-apply-cycle-count-mutation.js';
import { usePlanCycleCountQuery } from '@work-orders/common/queries/use-plan-cycle-count-query.js';
import { Tone } from '@shopify/polaris/build/ts/src/components/Badge/types.js';

type Props = {
  open: boolean;
  onClose: () => void;
  cycleCountName: string | null;
};

export function PlanCycleCountModal({ open, onClose, cycleCountName }: Props) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const [selectedUuids, setSelectedUuids] = useState<string[]>([]);

  const cycleCountQuery = useCycleCountQuery({ fetch, name: cycleCountName });
  const planCycleCountQuery = usePlanCycleCountQuery(
    { fetch, name: cycleCountName ?? '' },
    {
      staleTime: 0,
    },
  );

  const applyCycleCountMutation = useApplyCycleCountMutation({ fetch });

  // Set all items as selected by default when plan loads
  useEffect(() => {
    if (planCycleCountQuery.data) {
      setSelectedUuids(planCycleCountQuery.data.itemApplications.map(item => item.uuid));
    }
  }, [planCycleCountQuery.data]);

  const plan = planCycleCountQuery.data;
  if (!plan || !cycleCountQuery.data) return null;

  const productVariantIds = cycleCountQuery.data.items.map(item => item.productVariantId);
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apply Cycle Count"
      primaryAction={{
        content: 'Apply Selected',
        disabled: selectedUuids.length === 0,
        loading: applyCycleCountMutation.isPending,
        onAction: () => {
          if (!cycleCountName) return;
          applyCycleCountMutation.mutate(
            {
              cycleCountName,
              itemApplications: plan.itemApplications.filter(item => selectedUuids.includes(item.uuid)),
            },
            {
              onSuccess: () => {
                setToastAction({ content: 'Successfully applied cycle count' });
                onClose();
              },
              onError: () => {
                setToastAction({
                  content: 'Failed to apply cycle count',
                });
              },
            },
          );
        },
      }}
    >
      <Modal.Section>
        <ResourceList
          items={plan.itemApplications
            .map(({ uuid, countQuantity, originalQuantity }) => {
              const item = cycleCountQuery.data?.items.find(hasPropertyValue('uuid', uuid));
              if (!item) return null;

              const productVariant = productVariantQueries[item.productVariantId]?.data;
              const label =
                getProductVariantName(
                  productVariant ?? {
                    title: item.productVariantTitle,
                    product: {
                      title: item.productTitle,
                      hasOnlyDefaultVariant: false,
                    },
                  },
                ) ?? 'Unknown product';

              const delta = countQuantity - originalQuantity;
              const sign = delta === 0 ? '=' : delta > 0 ? '+' : '-';
              const tone: Tone = delta === 0 ? 'info' : delta > 0 ? 'success' : 'critical';

              return {
                id: uuid,
                item,
                label,
                delta,
                sign,
                tone,
                countQuantity,
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)}
          renderItem={({ id, label, delta, sign, tone, countQuantity }) => (
            <ResourceItem
              id={id}
              onClick={() => {
                setSelectedUuids(current => {
                  if (current.includes(id)) {
                    return current.filter(x => x !== id);
                  }
                  return [...current, id];
                });
              }}
            >
              <BlockStack gap="200">
                <Text variant="bodyMd" fontWeight="bold" as="span">
                  {label}
                </Text>
                <BlockStack gap="200">
                  <Badge tone={tone}>{`${sign}${Math.abs(delta)} (${countQuantity})`}</Badge>
                </BlockStack>
              </BlockStack>
            </ResourceItem>
          )}
        />
      </Modal.Section>
      {toast}
    </Modal>
  );
}
