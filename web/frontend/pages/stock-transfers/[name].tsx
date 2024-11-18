import { useLocation } from 'react-router-dom';
import { ContextualSaveBar, Loading, TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { BlockStack, Box, Card, EmptyState, Frame, Layout, Page, Text, Tooltip } from '@shopify/polaris';
import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { emptyState } from '@web/frontend/assets/index.js';
import { useStockTransferQuery } from '@work-orders/common/queries/use-stock-transfer-query.js';
import { defaultCreateStockTransfer } from '@work-orders/common/create-stock-transfer/default.js';
import {
  useCreateStockTransferReducer,
  WIPCreateStockTransfer,
} from '@work-orders/common/create-stock-transfer/reducer.js';
import { useStockTransferMutation } from '@work-orders/common/queries/use-stock-transfer-mutation.js';
import { StockTransferGeneralCard } from '@web/frontend/components/stock-transfers/StockTransferGeneralCard.js';
import { StockTransferLineItemsCard } from '@web/frontend/components/stock-transfers/StockTransferLineItemsCard.js';
import { LinkedTasks, NewLinkedTaskButton, BaseNewTaskButton } from '@web/frontend/components/tasks/LinkedTasks.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { CreateStockTransfer } from '@web/schemas/generated/create-stock-transfer.js';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';

export default function () {
  return (
    <Frame>
      <Page>
        <PermissionBoundary permissions={['read_stock_transfers', 'read_settings']}>
          <StockTransferLoader />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function StockTransferLoader() {
  const location = useLocation();
  const name = decodeURIComponent(location.pathname.split('/').pop() ?? '');
  const searchParams = new URLSearchParams(location.search);
  const type = searchParams.get('type') as 'incoming' | 'outgoing' | null;

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });
  const defaultLocationId = currentEmployeeQuery.data?.defaultLocationId;

  const stockTransferQuery = useStockTransferQuery({ fetch, name }, { enabled: name !== 'new', staleTime: 0 });
  const settingsQuery = useSettingsQuery({ fetch });

  const app = useAppBridge();

  if (!name) {
    Redirect.create(app).dispatch(Redirect.Action.APP, '/stock-transfers');
    return null;
  }

  if (stockTransferQuery.isError || settingsQuery.isError) {
    return (
      <Card>
        <EmptyState
          heading="An error occurred"
          image={emptyState}
          action={{
            content: 'Retry',
            onAction: () => stockTransferQuery.refetch(),
          }}
        >
          {stockTransferQuery.isError && (
            <Text as="p" variant="bodyMd" fontWeight="bold">
              {extractErrorMessage(stockTransferQuery.error, 'An error occurred while loading stock transfer')}
            </Text>
          )}
        </EmptyState>
        {toast}
      </Card>
    );
  }

  if ((name !== 'new' && !stockTransferQuery.data) || !settingsQuery.data || !currentEmployeeQuery.data) {
    return <Loading />;
  }

  let initial: WIPCreateStockTransfer;
  if (name === 'new') {
    initial = {
      ...defaultCreateStockTransfer,
      // Set default location based on type
      fromLocationId: type === 'outgoing' ? defaultLocationId : null,
      toLocationId: type === 'incoming' ? defaultLocationId : null,
    };
  } else {
    initial = stockTransferQuery.data;
  }

  return (
    <>
      <StockTransfer initial={initial} />
      {toast}
    </>
  );
}

function StockTransfer({ initial }: { initial: WIPCreateStockTransfer }) {
  const [createStockTransfer, dispatch, hasUnsavedChanges, setHasUnsavedChanges] =
    useCreateStockTransferReducer(initial);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const stockTransferMutation = useStockTransferMutation({ fetch });

  const saveStockTransfer = () => {
    const { fromLocationId, toLocationId } = createStockTransfer;

    if (!fromLocationId) {
      setToastAction({ content: 'From location is required' });
      return;
    }

    if (!toLocationId) {
      setToastAction({ content: 'To location is required' });
      return;
    }

    const validStockTransfer = {
      ...createStockTransfer,
      fromLocationId,
      toLocationId,
    } satisfies CreateStockTransfer;

    stockTransferMutation.mutate(validStockTransfer);
  };

  return (
    <Box paddingBlockEnd="1600">
      <TitleBar title="Stock transfers" />

      <ContextualSaveBar
        fullWidth
        visible={hasUnsavedChanges}
        saveAction={{
          loading: stockTransferMutation.isPending,
          onAction: saveStockTransfer,
        }}
        discardAction={{
          onAction: () => {
            dispatch.set(initial);
            setHasUnsavedChanges(false);
          },
        }}
      />

      <BlockStack gap="400">
        <Text as="h1" variant="headingLg" fontWeight="bold">
          {createStockTransfer.name ?? 'New stock transfer'}
        </Text>

        <StockTransferGeneralCard
          createStockTransfer={createStockTransfer}
          dispatch={dispatch}
          disabled={stockTransferMutation.isPending}
        />

        <Layout>
          <Layout.Section>
            <StockTransferLineItemsCard
              createStockTransfer={createStockTransfer}
              dispatch={dispatch}
              disabled={stockTransferMutation.isPending}
            />
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <LinkedTasks
                links={{ transferOrders: [createStockTransfer.name].filter(isNonNullable) }}
                disabled={stockTransferMutation.isPending}
                action={tasks =>
                  !!createStockTransfer.name ? (
                    <NewLinkedTaskButton
                      links={{ transferOrders: [createStockTransfer.name] }}
                      suggestedDeadlines={tasks.map(task => task.deadline).filter(isNonNullable)}
                    />
                  ) : (
                    <Tooltip content="You must save your stock transfer before you can create tasks">
                      <BaseNewTaskButton disabled />
                    </Tooltip>
                  )
                }
              />
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {toast}
    </Box>
  );
}
