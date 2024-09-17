import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCycleCountQuery } from '@work-orders/common/queries/use-cycle-count-query.js';
import { usePlanCycleCountQuery } from '@work-orders/common/queries/use-plan-cycle-count-query.js';
import { Banner, Button, List, ListRow, ScrollView, Text } from '@shopify/retail-ui-extensions-react';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useRouter } from '../routes.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useApplyCycleCountMutation } from '@work-orders/common/queries/use-apply-cycle-count-mutation.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { DetailedCycleCount } from '@web/services/cycle-count/types.js';
import { useEffect, useState } from 'react';

/**
 * Display a cycle count application plan before applying it.
 */
export function PlanCycleCount({
  name,
  onSuccess,
}: {
  name: string;
  onSuccess?: (cycleCount: DetailedCycleCount) => void;
}) {
  const fetch = useAuthenticatedFetch();

  const planCycleCountQuery = usePlanCycleCountQuery({ fetch, name }, { staleTime: 0 });
  const cycleCountQuery = useCycleCountQuery({ fetch, name }, { staleTime: 0 });

  const applyCycleCountMutation = useApplyCycleCountMutation({ fetch });

  const productVariantIds = unique(cycleCountQuery.data?.items.map(item => item.productVariantId) ?? []);
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const screen = useScreen();
  const router = useRouter();

  screen.setIsLoading(
    planCycleCountQuery.isFetching || cycleCountQuery.isFetching || applyCycleCountMutation.isLoading,
  );

  const [selectedUuids, setSelectedUuids] = useState<string[]>([]);

  useEffect(() => {
    if (planCycleCountQuery.data) {
      setSelectedUuids(planCycleCountQuery.data.itemApplications.map(item => item.uuid));
    }
  }, [planCycleCountQuery.data]);

  if (planCycleCountQuery.isError) {
    return (
      <ScrollView>
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(planCycleCountQuery.error, 'An error occurred while loading cycle count plan')}
          </Text>
        </ResponsiveStack>
      </ScrollView>
    );
  }

  if (cycleCountQuery.isError) {
    return (
      <ScrollView>
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(cycleCountQuery.error, 'An error occurred while loading cycle count')}
          </Text>
        </ResponsiveStack>
      </ScrollView>
    );
  }

  if (!planCycleCountQuery.data || !cycleCountQuery.data) {
    return null;
  }

  const cycleCount = cycleCountQuery.data;
  const plan = planCycleCountQuery.data;

  return (
    <ScrollView>
      <ResponsiveStack direction="vertical" spacing={2}>
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="headingLarge">{cycleCount.name}</Text>
        </ResponsiveStack>

        {applyCycleCountMutation.isError && (
          <Banner
            title={extractErrorMessage(
              applyCycleCountMutation.error,
              'Something went wrong while applying cycle count',
            )}
            visible
            variant={'error'}
          />
        )}

        <List
          isLoadingMore={false}
          onEndReached={() => {}}
          imageDisplayStrategy={'always'}
          data={plan.itemApplications.map<ListRow>(({ uuid, countQuantity, originalQuantity }) => {
            const item = cycleCount.items.find(hasPropertyValue('uuid', uuid));
            const productVariantQuery = productVariantQueries[item?.productVariantId ?? ''];
            const productVariant = productVariantQuery?.data;

            const label = !item
              ? 'Unknown product'
              : getProductVariantName(
                  productVariant ?? {
                    title: item.productVariantTitle,
                    product: { title: item.productTitle, hasOnlyDefaultVariant: false },
                  },
                ) ?? 'Unknown product';

            const delta = countQuantity - originalQuantity;
            const sign = delta === 0 ? '=' : delta > 0 ? '+' : '-';

            const isSelected = selectedUuids.includes(uuid);

            return {
              id: uuid,
              onPress() {
                setSelectedUuids(current => {
                  if (current.includes(uuid)) {
                    return current.filter(x => x !== uuid);
                  }

                  return [...current, uuid];
                });
              },
              leftSide: {
                label,
                image: {
                  source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
                  badge: countQuantity,
                },
                subtitle: [
                  {
                    content: `${sign} ${Math.abs(delta)}`,
                    color: delta === 0 ? 'TextSubdued' : delta > 0 ? 'TextSuccess' : 'TextCritical',
                  },
                ],
              },
              rightSide: {
                toggleSwitch: {
                  value: isSelected,
                },
              },
            };
          })}
        />

        <Button
          title={'Apply count'}
          type={'primary'}
          isLoading={applyCycleCountMutation.isLoading}
          isDisabled={selectedUuids.length === 0}
          onPress={() =>
            applyCycleCountMutation.mutate(
              {
                cycleCountName: plan.cycleCountName,
                itemApplications: plan.itemApplications.filter(item => selectedUuids.includes(item.uuid)),
              },
              {
                onSuccess(cycleCount) {
                  onSuccess?.(cycleCount);
                  router.popCurrent();
                },
              },
            )
          }
        />
      </ResponsiveStack>
    </ScrollView>
  );
}
