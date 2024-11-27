import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useSerialsQuery } from '@work-orders/common/queries/use-serials-query.js';
import { useDebouncedState } from '@work-orders/common-pos/hooks/use-debounced-state.js';
import { useEffect, useState } from 'react';
import { SerialSortColumn, SerialSortOrder } from '@web/schemas/generated/serial-pagination-options.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useSerialQuery } from '@work-orders/common/queries/use-serial-query.js';
import { useRouter } from '../../routes.js';
import { Banner, Button, List, ListRow, ScrollView, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ControlledSearchBar } from '@teifi-digital/pos-tools/components/ControlledSearchBar.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { getCreateSerialFromDetailedSerial } from '@work-orders/common/create-serial/get-create-serial-from-detailed-serial.js';
import { getDefaultCreateSerial } from '@work-orders/common/create-serial/default.js';

const sortColumns = ['created-at', 'updated-at', 'serial', 'product-name'] as const satisfies SerialSortColumn[];
const sortOrders = ['ascending', 'descending'] as const satisfies SerialSortOrder[];

type SortColumn = (typeof sortColumns)[number];
type SortOrder = (typeof sortOrders)[number];

export function SerialsList() {
  const [query, setQuery] = useDebouncedState('');
  const [locationId, setLocationId] = useState<ID>();
  const [customerId, setCustomerId] = useState<ID>();
  const [productVariantId, setProductVariantId] = useState<ID>();
  const [sort, setSort] = useState<SortColumn>('created-at');
  const [order, setOrder] = useState<SortOrder>('descending');

  const activeFilterCount = [locationId, customerId, productVariantId].filter(Boolean).length;

  const fetch = useAuthenticatedFetch();
  const serialsQuery = useSerialsQuery({ fetch, params: { limit: 25, query, locationId, customerId, sort, order } });
  const serials = serialsQuery.data?.pages.flat() ?? [];

  const productVariantIds = unique(serials.map(serial => serial.productVariant.id));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const [selectedSerial, setSelectedSerial] = useState<{ serial: string; productVariantId: ID }>();

  const router = useRouter();
  const selectedSerialQuery = useSerialQuery(
    {
      fetch,
      productVariantId: selectedSerial?.productVariantId ?? null,
      serial: selectedSerial?.serial ?? null,
    },
    { staleTime: 0 },
  );

  useEffect(() => {
    if (selectedSerial && selectedSerialQuery.data) {
      const initial = getCreateSerialFromDetailedSerial(selectedSerialQuery.data);
      router.push('Serial', { initial });
      setSelectedSerial(undefined);
    }
  }, [selectedSerialQuery.data, selectedSerial]);

  const screen = useScreen();
  screen.setIsLoading(selectedSerialQuery.isFetching);

  const { session } = useApi<'pos.home.modal.render'>();

  return (
    <ScrollView>
      <ResponsiveStack direction={'vertical'} spacing={2}>
        <ResponsiveStack
          direction={'horizontal'}
          alignment={'space-between'}
          sm={{ direction: 'vertical', alignment: 'center' }}
        >
          {selectedSerial && selectedSerialQuery.isError && (
            <Banner
              title={`Could not load ${selectedSerial}: ${extractErrorMessage(selectedSerialQuery.error, 'unknown error')}`}
              variant={'error'}
              visible
              action={'Retry'}
              onPress={() => selectedSerialQuery.refetch()}
            />
          )}

          <ResponsiveStack direction={'horizontal'} sm={{ alignment: 'center', paddingVertical: 'Small' }}>
            <Text variant="headingLarge">Serials</Text>
          </ResponsiveStack>

          <ResponsiveStack direction={'horizontal'} sm={{ direction: 'vertical' }}>
            <Button
              title={'New serial'}
              type={'primary'}
              onPress={() =>
                router.push('ProductVariantSelector', {
                  filters: { type: ['serial'] },
                  onSelect: productVariant =>
                    router.push('Serial', {
                      initial: {
                        ...getDefaultCreateSerial(productVariant.id),
                        locationId: createGid('Location', session.currentSession.locationId),
                      },
                    }),
                })
              }
            />
          </ResponsiveStack>
        </ResponsiveStack>

        <ResponsiveStack direction={'horizontal'} alignment={'center'} flex={1} paddingHorizontal={'HalfPoint'}>
          <Text variant="body" color="TextSubdued">
            {serialsQuery.isRefetching ? 'Loading...' : ' '}
          </Text>
        </ResponsiveStack>

        <ResponsiveGrid columns={2} spacing={2}>
          <Button
            title={'Filters' + (activeFilterCount > 0 ? ` (${activeFilterCount})` : '')}
            onPress={() =>
              router.push('SerialsFilters', {
                locationId,
                customerId,
                productVariantId,
                onLocationId: setLocationId,
                onCustomerId: setCustomerId,
                onProductVariantId: setProductVariantId,
              })
            }
          />

          <ResponsiveGrid columns={2} smColumns={2} spacing={2}>
            <Button
              title={`Sort by ${sentenceCase(sort).toLowerCase()}`}
              onPress={() =>
                setSort(current => sortColumns[(sortColumns.indexOf(current) + 1) % sortColumns.length] ?? current)
              }
            />
            <Button
              title={sentenceCase(order)}
              onPress={() =>
                setOrder(current => sortOrders[(sortOrders.indexOf(current) + 1) % sortOrders.length] ?? current)
              }
            />
          </ResponsiveGrid>

          {activeFilterCount > 0 && (
            <Button
              title={'Clear'}
              onPress={() => {
                setLocationId(undefined);
                setCustomerId(undefined);
              }}
              type={'destructive'}
            />
          )}
        </ResponsiveGrid>

        <ControlledSearchBar
          value={query}
          onTextChange={query => setQuery(query, !query)}
          onSearch={() => {}}
          placeholder={'Search serials'}
        />

        <List
          imageDisplayStrategy={'always'}
          data={serials.map<ListRow>(serial => {
            const productVariant = productVariantQueries[serial.productVariant.id]?.data;

            return {
              id: `${serial.productVariant.id}-${serial.serial}`,
              onPress: () => setSelectedSerial({ serial: serial.serial, productVariantId: serial.productVariant.id }),
              leftSide: {
                label: getProductVariantName(productVariant ?? serial.productVariant) ?? 'Unknown product',
                subtitle: getSubtitle([serial.serial, serial.location?.name]),
                image: {
                  source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
                },
              },
              rightSide: {
                showChevron: true,
              },
            };
          })}
          onEndReached={serialsQuery.fetchNextPage}
          isLoadingMore={serialsQuery.isFetchingNextPage}
        />

        {serialsQuery.isLoading && (
          <ResponsiveStack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading serials...
            </Text>
          </ResponsiveStack>
        )}

        {serialsQuery.isSuccess && !serialsQuery.data?.pages.flat().length && (
          <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No serials found
            </Text>
          </ResponsiveStack>
        )}

        {serialsQuery.isError && (
          <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              {extractErrorMessage(serialsQuery.error, 'An error occurred while loading serials')}
            </Text>
          </ResponsiveStack>
        )}
      </ResponsiveStack>
    </ScrollView>
  );
}
