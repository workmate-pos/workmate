import { useLocation } from 'react-router-dom';
import { ContextualSaveBar, Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { useReducer, useRef, useState, useCallback } from 'react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { BlockStack, Box, Card, EmptyState, Frame, Layout, Page, Text, Tooltip } from '@shopify/polaris';
import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import { useCycleCountQuery } from '@work-orders/common/queries/use-cycle-count-query.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { emptyState } from '@web/frontend/assets/index.js';
import { useCycleCountMutation } from '@work-orders/common/queries/use-cycle-count-mutation.js';
import type { DetailedCycleCount } from '@web/services/cycle-count/types.js';
import type { CreateCycleCount } from '@web/schemas/generated/create-cycle-count.js';
import { useCreateCycleCountReducer } from '@work-orders/common/create-cycle-count/reducer.js';
import { CycleCountGeneralCard } from '@web/frontend/components/cycle-counts/CycleCountGeneralCard.js';
import { CycleCountItemsCard } from '@web/frontend/components/cycle-counts/CycleCountItemsCard.js';
import { LinkedTasks, NewLinkedTaskButton, BaseNewTaskButton } from '@web/frontend/components/tasks/LinkedTasks.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { LocationSelectorModal } from '@web/frontend/components/shared-orders/modals/LocationSelectorModal.js';
import { defaultCreateCycleCount } from '@work-orders/common/create-cycle-count/default.js';
import { useAllLocationsQuery } from '@work-orders/common/queries/use-all-locations-query.js';
import { ProductVariantSelectorModal } from '@web/frontend/components/selectors/ProductVariantSelectorModal.js';
import type { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_settings']}>
          <CycleCountLoader />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function CycleCountLoader() {
  const location = useLocation();
  const name = decodeURIComponent(location.pathname.split('/').pop() ?? '');

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const cycleCountQuery = useCycleCountQuery({ fetch, name: name === 'new' ? null : name }, { staleTime: 0 });
  const settingsQuery = useSettingsQuery({ fetch });
  const locationsQuery = useAllLocationsQuery({ fetch });

  const app = useAppBridge();
  if (!name) {
    Redirect.create(app).dispatch(Redirect.Action.APP, '/cycle-counts');
    return null;
  }

  if (cycleCountQuery.isError || settingsQuery.isError || locationsQuery.isError) {
    return (
      <>
        <Card>
          <EmptyState image={emptyState} heading={'An error occurred'}>
            <Text as={'p'} variant={'bodyLg'} fontWeight={'bold'} tone={'critical'}>
              {extractErrorMessage(
                cycleCountQuery.error ?? settingsQuery.error ?? locationsQuery.error,
                'An error occurred while loading cycle count',
              )}
            </Text>
          </EmptyState>
        </Card>
        {toast}
      </>
    );
  }

  if ((name !== 'new' && !cycleCountQuery.data) || !settingsQuery.data || !locationsQuery.data) {
    return (
      <>
        <Loading />
        {toast}
      </>
    );
  }

  let createCycleCount;
  if (cycleCountQuery.data) {
    createCycleCount = cycleCountQuery.data;
  } else {
    const firstLocation = locationsQuery.data[0];
    if (!firstLocation) {
      throw new Error('No locations available');
    }
    createCycleCount = defaultCreateCycleCount(firstLocation.id);
  }

  return (
    <>
      <CycleCount initialCreateCycleCount={createCycleCount} cycleCount={cycleCountQuery.data ?? null} />
      {toast}
    </>
  );
}

function CycleCount({
  initialCreateCycleCount,
  cycleCount,
}: {
  initialCreateCycleCount: CreateCycleCount;
  cycleCount: DetailedCycleCount | null;
}) {
  const app = useAppBridge();
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [createCycleCount, dispatch, hasUnsavedChanges, setHasUnsavedChanges] = useCreateCycleCountReducer(
    initialCreateCycleCount,
    { useReducer, useState, useRef },
  );

  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);

  const cycleCountMutation = useCycleCountMutation(
    { fetch },
    {
      onSuccess: updatedCycleCount => {
        const message = createCycleCount.name ? 'Cycle count updated' : 'Cycle count created';
        setToastAction({ content: message });
        dispatch.set(updatedCycleCount);
        setHasUnsavedChanges(false);
        Redirect.create(app).dispatch(
          Redirect.Action.APP,
          `/cycle-counts/${encodeURIComponent(updatedCycleCount.name)}`,
        );
      },
    },
  );

  const handleProductSelection = useCallback(
    (productVariant: ProductVariant) => {
      dispatch.addProductVariants({ productVariants: [productVariant] });
    },
    [dispatch],
  );

  return (
    <Box paddingBlockEnd={'1600'}>
      <TitleBar title={'Cycle counts'} />

      <ContextualSaveBar
        fullWidth
        visible={hasUnsavedChanges}
        saveAction={{
          loading: cycleCountMutation.isPending,
          onAction: () => cycleCountMutation.mutate(createCycleCount),
          disabled: cycleCountMutation.isPending,
        }}
        discardAction={{
          onAction: () => dispatch.set(initialCreateCycleCount),
        }}
      />

      <BlockStack gap={'400'}>
        <Text as={'h1'} variant={'headingLg'} fontWeight={'bold'}>
          {createCycleCount.name ?? 'New cycle count'}
        </Text>

        <CycleCountGeneralCard
          createCycleCount={createCycleCount}
          dispatch={dispatch}
          disabled={cycleCountMutation.isPending}
          onLocationSelect={() => setIsLocationSelectorOpen(true)}
        />

        <Layout>
          <Layout.Section>
            <CycleCountItemsCard
              createCycleCount={createCycleCount}
              cycleCount={cycleCount}
              dispatch={dispatch}
              disabled={cycleCountMutation.isPending}
              onAddProducts={() => setIsProductSelectorOpen(true)}
            />
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <LinkedTasks
                links={{ cycleCounts: [createCycleCount.name].filter(isNonNullable) }}
                disabled={cycleCountMutation.isPending}
                action={
                  !!createCycleCount.name ? (
                    <NewLinkedTaskButton links={{ cycleCounts: [createCycleCount.name] }} />
                  ) : (
                    <Tooltip content={'You must save your cycle count before you can create tasks'}>
                      <BaseNewTaskButton disabled />
                    </Tooltip>
                  )
                }
              />
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {isLocationSelectorOpen && (
        <LocationSelectorModal
          open={isLocationSelectorOpen}
          onClose={() => setIsLocationSelectorOpen(false)}
          onSelect={locationId => dispatch.setLocation({ locationId })}
        />
      )}

      {isProductSelectorOpen && (
        <ProductVariantSelectorModal
          open={isProductSelectorOpen}
          onClose={() => setIsProductSelectorOpen(false)}
          onSelect={handleProductSelection}
          filters={{ type: 'product' }}
        />
      )}

      {toast}
    </Box>
  );
}