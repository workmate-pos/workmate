import { Modal, ResourceList, Text, BlockStack, ResourceItem, Banner } from '@shopify/polaris';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCycleCountQuery } from '@work-orders/common/queries/use-cycle-count-query.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useState, useEffect } from 'react';
import { useApplyCycleCountMutation } from '@work-orders/common/queries/use-apply-cycle-count-mutation.js';
import { usePlanCycleCountQuery } from '@work-orders/common/queries/use-plan-cycle-count-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

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
  const planCycleCountQuery = usePlanCycleCountQuery({ fetch, name: cycleCountName ?? null });
  const applyCycleCountMutation = useApplyCycleCountMutation({ fetch });

  const plan = planCycleCountQuery.data;
  const productVariantIds = cycleCountQuery.data?.items.map(item => item.productVariantId) ?? [];
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  // Set all items as selected by default when plan loads
  useEffect(() => {
    if (planCycleCountQuery.data) {
      setSelectedUuids(planCycleCountQuery.data.itemApplications.map(item => item.uuid));
    }
  }, [planCycleCountQuery.data]);

  const isLoading = [
    cycleCountQuery.isLoading,
    planCycleCountQuery.isFetching,
    Object.values(productVariantQueries).some(query => query.isLoading),
  ].includes(true);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Apply cycle count"
        loading={isLoading}
        primaryAction={{
          content: 'Apply selected',
          disabled: !plan || selectedUuids.length === 0,
          loading: applyCycleCountMutation.isPending,
          onAction: () => {
            if (!cycleCountName || !plan) return;
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
        {cycleCountQuery.isError && (
          <Modal.Section>
            <Banner
              title="Error loading cycle count"
              tone="critical"
              action={{
                content: 'Retry',
                onAction: () => cycleCountQuery.refetch(),
              }}
            >
              {extractErrorMessage(cycleCountQuery.error, 'An error occurred while loading cycle count')}
            </Banner>
          </Modal.Section>
        )}

        {planCycleCountQuery.isError && (
          <Modal.Section>
            <Banner
              title="Error loading cycle count plan"
              tone="critical"
              action={{
                content: 'Retry',
                onAction: () => planCycleCountQuery.refetch(),
              }}
            >
              {extractErrorMessage(planCycleCountQuery.error, 'An error occurred while loading cycle count plan')}
            </Banner>
          </Modal.Section>
        )}

        {Object.values(productVariantQueries).some(query => query.isError) && (
          <Modal.Section>
            <Banner
              title="Error loading products"
              tone="critical"
              action={{
                content: 'Retry',
                onAction: () => Object.values(productVariantQueries).forEach(query => query.refetch()),
              }}
            >
              {extractErrorMessage(
                Object.values(productVariantQueries).find(query => query.isError)?.error,
                'An error occurred while loading products',
              )}
            </Banner>
          </Modal.Section>
        )}

        {applyCycleCountMutation.isError && (
          <Modal.Section>
            <Banner title={'Error applying cycle count'} tone="critical">
              {extractErrorMessage(applyCycleCountMutation.error, 'Something went wrong while applying cycle count')}
            </Banner>
          </Modal.Section>
        )}

        {plan && plan.itemApplications.length === 0 && (
          <Modal.Section>
            <Text as="p" variant="bodyMd" tone="subdued">
              No items to apply
            </Text>
          </Modal.Section>
        )}

        {plan && cycleCountQuery.data && (
          <ResourceList
            selectable
            selectedItems={selectedUuids}
            resolveItemId={item => item.uuid}
            idForItem={item => item.uuid}
            onSelectionChange={selectedUuids =>
              selectedUuids === 'All'
                ? setSelectedUuids(cycleCountQuery.data?.items.map(item => item.uuid) ?? [])
                : setSelectedUuids(selectedUuids)
            }
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

                return {
                  uuid,
                  item,
                  label,
                  delta,
                  sign,
                  countQuantity,
                };
              })
              .filter(isNonNullable)}
            renderItem={({ uuid, label, delta, sign, countQuantity }) => (
              <ResourceItem
                id={uuid}
                onClick={() =>
                  setSelectedUuids(current => {
                    if (current.includes(uuid)) {
                      return current.filter(x => x !== uuid);
                    }

                    return [...current, uuid];
                  })
                }
              >
                <BlockStack gap="050">
                  <Text variant="bodyMd" fontWeight="bold" as="span">
                    {label}
                  </Text>
                  <BlockStack gap="200">
                    <Text as="span" tone={delta === 0 ? 'subdued' : delta > 0 ? 'success' : 'critical'}>
                      {`${sign}${Math.abs(delta)} (${countQuantity})`}
                    </Text>
                  </BlockStack>
                </BlockStack>
              </ResourceItem>
            )}
          />
        )}
      </Modal>

      {toast}
    </>
  );
}
