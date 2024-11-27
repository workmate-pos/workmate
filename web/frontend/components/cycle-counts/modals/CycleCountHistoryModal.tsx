import { Modal, ResourceList, Text, BlockStack, Thumbnail, ResourceItem, SkeletonThumbnail } from '@shopify/polaris';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCycleCountQuery } from '@work-orders/common/queries/use-cycle-count-query.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useToast } from '@teifi-digital/shopify-app-react';

type Props = {
  open: boolean;
  onClose: () => void;
  cycleCountName: string | null;
};

export function CycleCountHistoryModal({ open, onClose, cycleCountName }: Props) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const cycleCountQuery = useCycleCountQuery({ fetch, name: cycleCountName }, { staleTime: 0 });

  // Get all employee IDs from applications
  const employeeIds = unique(
    cycleCountQuery.data?.items
      .flatMap(item => item.applications)
      .map(application => application.staffMemberId)
      .filter(isNonNullable) ?? [],
  );

  // Fetch employee data
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });

  // Get items with applications
  const itemsWithApplications = cycleCountQuery.data?.items.filter(item => item.applications.length > 0) ?? [];

  // Get product variant IDs and fetch their data
  const productVariantIds = unique(itemsWithApplications.map(item => item.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  // Get all applications and sort by date
  const allItemApplications = itemsWithApplications.flatMap(item => item.applications) ?? [];
  const orderedApplicationDates = unique(allItemApplications.map(app => app.appliedAt)).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <Modal open={open} onClose={onClose} title="Application History">
      <Modal.Section>
        <BlockStack gap="400">
          {orderedApplicationDates.map(dateTime => {
            const dateApplications = allItemApplications.filter(hasPropertyValue('appliedAt', dateTime));

            const employeeIds = unique(
              dateApplications.flatMap(application => application.staffMemberId).filter(isNonNullable),
            );

            const employeeNames = employeeIds.map(id => {
              const query = employeeQueries[id];
              return query?.isLoading ? 'Loading...' : (query?.data?.name ?? 'Unknown employee');
            });

            return (
              <BlockStack key={dateTime} gap="400">
                <Text as="h3" variant="headingMd">
                  {`${new Date(dateTime).toLocaleDateString()} - ${employeeNames.join(', ')}`}
                </Text>

                <ResourceList
                  items={dateApplications
                    .map(application => {
                      const item = itemsWithApplications.find(item => item.applications.includes(application));

                      if (!item) return null;

                      const productVariant = productVariantQueries[item.productVariantId]?.data;
                      const label = getProductVariantName(productVariant) ?? 'Unknown product';
                      const imageUrl = productVariant?.image?.url;

                      const delta = application.appliedQuantity - application.originalQuantity;
                      const sign = delta === 0 ? '=' : delta > 0 ? '+' : '-';

                      return {
                        id: `${item.uuid}-${application.appliedAt}`,
                        imageUrl,
                        application,
                        label,
                        delta,
                        sign,
                      };
                    })
                    .filter(isNonNullable)}
                  renderItem={({ id, imageUrl, application, label, delta, sign }) => (
                    <ResourceItem
                      id={id}
                      media={imageUrl ? <Thumbnail source={imageUrl} alt={label} /> : <SkeletonThumbnail />}
                      onClick={() => {}}
                    >
                      <BlockStack gap="200">
                        <Text variant="bodyMd" fontWeight="bold" as="span">
                          {label}
                        </Text>
                        <BlockStack gap="200">
                          <Text as="span" tone={delta === 0 ? 'subdued' : delta > 0 ? 'success' : 'critical'}>
                            {`${sign}${Math.abs(delta)} (${application.appliedQuantity})`}
                          </Text>
                        </BlockStack>
                      </BlockStack>
                    </ResourceItem>
                  )}
                />
              </BlockStack>
            );
          })}

          {orderedApplicationDates.length === 0 && (
            <Text as="p" tone="subdued" alignment="center">
              No applications found
            </Text>
          )}
        </BlockStack>
      </Modal.Section>
      {toast}
    </Modal>
  );
}
