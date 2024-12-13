import { List, ListRow, ScrollView, Stack, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useCycleCountQuery } from '@work-orders/common/queries/use-cycle-count-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';

export function CycleCountApplications({ name }: { name: string | null }) {
  const fetch = useAuthenticatedFetch();
  const cycleCountQuery = useCycleCountQuery({ fetch, name }, { staleTime: 0 });

  const employeeIds = unique(
    cycleCountQuery.data?.items
      .flatMap(item => item.applications)
      .map(application => application.staffMemberId)
      .filter(isNonNullable) ?? [],
  );

  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });

  const screen = useScreen();
  screen.setIsLoading(cycleCountQuery.isFetching || Object.values(employeeQueries).some(query => query.isLoading));

  const itemsWithApplications = cycleCountQuery.data?.items.filter(item => item.applications.length > 0) ?? [];

  const productVariantIds = unique(itemsWithApplications.map(item => item.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const allItemApplications = itemsWithApplications.flatMap(item => item.applications) ?? [];

  // Unique dates from most recent to oldest. Used to group applications by date.
  const orderedApplicationDates = unique(allItemApplications.map(application => application.appliedAt)).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <ScrollView>
      {orderedApplicationDates.map(dateTime => {
        const dateApplications = allItemApplications.filter(hasPropertyValue('appliedAt', dateTime));

        const employeeIds = unique(
          dateApplications.flatMap(application => application.staffMemberId).filter(isNonNullable),
        );

        const employeeNames = employeeIds.map(id => {
          const query = employeeQueries[id];
          if (query?.isLoading) return 'Loading...';
          return query?.data?.name ?? 'Unknown employee';
        });

        const title = `${new Date().toLocaleDateString()} - ${employeeNames.join(', ')}`;

        return (
          <List
            title={title}
            data={dateApplications
              .map<ListRow | null>((application, i) => {
                const item = itemsWithApplications.find(item => item.applications.includes(application));

                if (!item) {
                  return null;
                }

                const productVariant = productVariantQueries[item.productVariantId]?.data;
                const label =
                  getProductVariantName(
                    productVariant ?? {
                      title: item.productVariantTitle,
                      product: { title: item.productTitle, hasOnlyDefaultVariant: false },
                    },
                  ) ?? 'Unknown product';

                const delta = application.appliedQuantity - application.originalQuantity;
                const sign = delta === 0 ? '=' : delta > 0 ? '+' : '-';

                return {
                  id: String(i),
                  leftSide: {
                    label,
                    image: {
                      source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
                      badge: application.appliedQuantity,
                    },
                    subtitle: [
                      {
                        content: `${sign} ${Math.abs(delta)}`,
                        color: delta === 0 ? 'TextSubdued' : delta > 0 ? 'TextSuccess' : 'TextCritical',
                      },
                    ],
                  },
                };
              })
              .filter(isNonNullable)}
            isLoadingMore={false}
            onEndReached={() => {}}
            imageDisplayStrategy={'always'}
          />
        );
      })}

      {(name === null || itemsWithApplications.length === 0) && (
        <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No applied cycle counts
          </Text>
        </Stack>
      )}
    </ScrollView>
  );
}
