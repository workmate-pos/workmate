import { useForm } from '@teifi-digital/pos-tools/form';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useStockTransferMutation } from '@work-orders/common/queries/use-stock-transfer-mutation.js';
import { Banner, List, ListRow, ScrollView, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import {
  CreateStockTransferDispatchProxy,
  useCreateStockTransferReducer,
  WIPCreateStockTransfer,
} from '../create-stock-transfer/reducer.js';
import { useRouter } from '../routes.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { stockTransferToCreateStockTransfer } from '../dto/stock-transfer-to-create-stock-transfer.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { getStockTransferLineItemStatusBadgeProps } from '../util/stock-transfer-line-item-status-badge-props.js';

export function StockTransfer({ initial }: { initial: WIPCreateStockTransfer }) {
  const [createStockTransfer, dispatch, hasUnsavedChanges, setHasUnsavedChanges] =
    useCreateStockTransferReducer(initial);

  const screen = useScreen();
  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  screen.setTitle(createStockTransfer.name ?? 'New Stock Transfer');
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  const fetch = useAuthenticatedFetch();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const stockTransferMutation = useStockTransferMutation({ fetch });
  const mutate = () => {
    const { fromLocationId, toLocationId } = createStockTransfer;

    if (fromLocationId === null || toLocationId === null) {
      toast.show('You must select a location to transfer from and to');
      return;
    }

    stockTransferMutation.mutate(
      { ...createStockTransfer, fromLocationId, toLocationId },
      {
        onSuccess(stockTransfer) {
          dispatch.set(stockTransferToCreateStockTransfer(stockTransfer));
          setHasUnsavedChanges(false);
          toast.show('Stock transfer saved');
        },
        onError() {
          toast.show('Error saving stock transfer');
        },
      },
    );
  };

  const { Form } = useForm();

  return (
    <Form disabled={stockTransferMutation.isLoading}>
      <ScrollView>
        <ResponsiveStack direction={'vertical'} spacing={2}>
          {stockTransferMutation.error && (
            <Banner
              title={`Error saving stock transfer: ${extractErrorMessage(stockTransferMutation.error, '')}`}
              variant={'error'}
              visible
            />
          )}

          <StockTransferProperties createStockTransfer={createStockTransfer} dispatch={dispatch} />

          <StockTransferItems createStockTransfer={createStockTransfer} dispatch={dispatch} />

          <FormStringField
            label={'Note'}
            type={'area'}
            value={createStockTransfer.note}
            onChange={(value: string) => dispatch.setPartial({ note: value })}
          />
        </ResponsiveStack>
      </ScrollView>

      <ResponsiveStack
        direction={'vertical'}
        spacing={0.5}
        paddingHorizontal={'HalfPoint'}
        paddingVertical={'HalfPoint'}
        flex={0}
      >
        <ResponsiveGrid columns={4} smColumns={2} grow flex={0}>
          <FormButton
            title={createStockTransfer.name ? 'Update Stock Transfer' : 'Create Stock Transfer'}
            type="primary"
            action={'submit'}
            disabled={!hasUnsavedChanges}
            loading={stockTransferMutation.isLoading}
            onPress={() => mutate()}
          />
        </ResponsiveGrid>
      </ResponsiveStack>
    </Form>
  );
}

function StockTransferProperties({
  createStockTransfer,
  dispatch,
}: {
  createStockTransfer: WIPCreateStockTransfer;
  dispatch: CreateStockTransferDispatchProxy;
}) {
  const fetch = useAuthenticatedFetch();

  const fromLocationQuery = useLocationQuery({ fetch, id: createStockTransfer.fromLocationId });
  const toLocationQuery = useLocationQuery({ fetch, id: createStockTransfer.toLocationId });

  const fromLocationName = (() => {
    if (!createStockTransfer.fromLocationId) return undefined;
    if (fromLocationQuery.isLoading) return 'Loading...';
    return fromLocationQuery.data?.name ?? 'Unknown location';
  })();

  const toLocationName = (() => {
    if (!createStockTransfer.toLocationId) return undefined;
    if (toLocationQuery.isLoading) return 'Loading...';
    return toLocationQuery.data?.name ?? 'Unknown location';
  })();

  const router = useRouter();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  return (
    <ResponsiveGrid columns={1} spacing={2}>
      {[fromLocationQuery, toLocationQuery]
        .filter(query => query.isError)
        .map(query => (
          <Banner title={extractErrorMessage(query.error, 'Error loading location name')} variant={'error'} visible />
        ))}

      <ResponsiveGrid columns={4} grow>
        {createStockTransfer.name && (
          <FormStringField label="Stock Transfer ID" disabled value={createStockTransfer.name} />
        )}

        <FormStringField
          label={'From Location'}
          value={fromLocationName}
          onFocus={() =>
            router.push('LocationSelector', {
              onSelect: ({ id: fromLocationId }) => {
                if (fromLocationId === createStockTransfer.toLocationId) {
                  toast.show('Source and destination locations cannot be the same');
                  return;
                }

                dispatch.setPartial({ fromLocationId });
              },
            })
          }
        />

        <FormStringField
          label={'To Location'}
          value={toLocationName}
          onFocus={() =>
            router.push('LocationSelector', {
              onSelect: ({ id: toLocationId }) => {
                if (toLocationId === createStockTransfer.fromLocationId) {
                  toast.show('Source and destination locations cannot be the same');
                  return;
                }

                dispatch.setPartial({ toLocationId });
              },
            })
          }
        />
      </ResponsiveGrid>
    </ResponsiveGrid>
  );
}

function StockTransferItems({
  createStockTransfer,
  dispatch,
}: {
  createStockTransfer: WIPCreateStockTransfer;
  dispatch: CreateStockTransferDispatchProxy;
}) {
  const router = useRouter();
  const rows = useStockTransferLineItemRows(createStockTransfer, dispatch);

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  return (
    <ResponsiveGrid columns={1} spacing={2}>
      <ResponsiveGrid columns={2} smColumns={1} grow>
        <FormButton
          title={'Add Product'}
          type={'primary'}
          action={'button'}
          onPress={() => {
            const { fromLocationId } = createStockTransfer;

            if (!fromLocationId) {
              toast.show('You must select a location to transfer from');
              return;
            }

            router.push('ProductSelector', { locationId: fromLocationId, dispatch });
          }}
        />
        <FormButton
          title={'Scan Items'}
          action={'button'}
          onPress={() => router.push('StockTransferLineItemScanner', { createStockTransfer, dispatch })}
        />
      </ResponsiveGrid>

      {rows.length > 0 && <List data={rows} imageDisplayStrategy={'always'} />}
      {rows.length === 0 && (
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical={'Large'}>
          <Text variant="body" color="TextSubdued">
            No products added to stock transfer
          </Text>
        </ResponsiveStack>
      )}
    </ResponsiveGrid>
  );
}

function useStockTransferLineItemRows(
  createStockTransfer: WIPCreateStockTransfer,
  dispatch: CreateStockTransferDispatchProxy,
): ListRow[] {
  const fetch = useAuthenticatedFetch();

  const inventoryItemIds = unique(createStockTransfer.lineItems.map(lineItem => lineItem.inventoryItemId));
  const inventoryItemQueries = useInventoryItemQueries({ fetch, locationId: null, ids: inventoryItemIds });

  const router = useRouter();

  return createStockTransfer.lineItems.map<ListRow>(lineItem => {
    const inventoryItemQuery = inventoryItemQueries[lineItem.inventoryItemId];
    const hasOnlyDefaultVariant = inventoryItemQuery?.data?.variant?.product?.hasOnlyDefaultVariant ?? false;
    const imageUrl =
      inventoryItemQuery?.data?.variant?.image?.url ?? inventoryItemQuery?.data?.variant?.product?.featuredImage?.url;

    return {
      id: lineItem.uuid,
      leftSide: {
        label:
          getProductVariantName({
            title: lineItem.productVariantTitle,
            product: {
              title: lineItem.productTitle,
              hasOnlyDefaultVariant,
            },
          }) ?? 'Unknown product',
        image: {
          source: imageUrl,
          badge: lineItem.quantity,
        },
        badges: [getStockTransferLineItemStatusBadgeProps(lineItem.status)],
      },
      rightSide: {
        showChevron: true,
      },
      onPress() {
        const { fromLocationId, toLocationId } = createStockTransfer;
        router.push('StockTransferLineItemConfig', { lineItem, dispatch, toLocationId, fromLocationId });
      },
    };
  });
}