import {
  Badge,
  BadgeProps,
  Banner,
  Button,
  CameraScanner,
  List,
  ListRow,
  ScrollView,
  Segment,
  SegmentedControl,
  Text,
  useApi,
  useScannerSourcesSubscription,
  useStatefulSubscribableScannerData,
} from '@shopify/ui-extensions-react/point-of-sale';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { Dispatch, ReactNode, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { StockTransferLineItemStatus } from '@web/services/db/queries/generated/stock-transfers.sql.js';
import { getStockTransferLineItemStatusBadgeProps } from '../../util/stock-transfer-line-item-status-badge-props.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { sentenceCase, titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useProductVariantByBarcodeQuery } from '@work-orders/common/queries/use-product-variant-by-barcode-query.js';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useRouter } from '../../routes.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useInventoryItemQueries } from '@work-orders/common/queries/use-inventory-item-query.js';
import {
  CreateStockTransferDispatchProxy,
  createStockTransferReducer,
  WIPCreateStockTransfer,
} from '../../create-stock-transfer/reducer.js';
import {
  CreateStockTransferLineItemStatus,
  Int,
  StockTransferLineItem,
} from '@web/schemas/generated/create-stock-transfer.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { uuid } from '@work-orders/common/util/uuid.js';

const MODE = {
  ADD_LINE_ITEMS: {
    name: 'Add line items',
    description: textWithBadges`Add new ${'PENDING'} or ${'IN_TRANSIT'} line items`,
    fromStatus: null,
    toStatuses: ['PENDING', 'IN_TRANSIT'],
    type: 'add',
  },
  SEND_LINE_ITEMS: {
    name: 'Send line items',
    description: textWithBadges`Mark ${'PENDING'} line items as ${'IN_TRANSIT'}`,
    fromStatus: 'PENDING',
    toStatuses: ['IN_TRANSIT'],
    type: 'update',
  },
  RECEIVE_LINE_ITEMS: {
    name: 'Receive line items',
    description: textWithBadges`Mark ${'IN_TRANSIT'} line items as ${'RECEIVED'} or ${'REJECTED'}`,
    fromStatus: 'IN_TRANSIT',
    toStatuses: ['RECEIVED', 'REJECTED'],
    type: 'update',
  },
} satisfies Record<string, Mode>;

type Mode = {
  name: string;
  description: ReactNode;
  fromStatus: CreateStockTransferLineItemStatus | null;
  toStatuses: StockTransferLineItemStatus[];
  /**
   * Type 'add' allows all toStatuses to be clicked.
   * Type 'update' only allows it if there is remaining quantity to update.
   */
  type: 'add' | 'update';
};

/**
 * An action that changes the stock transfer line items.
 * Shown to the user before applying the actual changes.
 * Actions can be modified to fix mistakes.
 */
export type Action = {
  inventoryItemId: ID;
  /**
   * If undefined, a new line item is created.
   */
  fromStatus: StockTransferLineItemStatus | null;
  toStatus: StockTransferLineItemStatus;
  quantity: Int;
  productTitle: string;
  productVariantTitle: string;
};

/**
 * Scanner that makes it easy to add new products/update existing product statuses.
 * Has three modes: "Add new line items"/"Send line items"/"Receive line items"
 * In "Add new line items" mode, you scan a barcode after which you click "Add" or "Send" to add/send a pending line item.
 * In the "Send line items" mode, you scan a barcode and select "Send" to change the status of this product. If there are no corresponding "Pending" line items, the "Send" button will be grayed out with a help text.
 * In "Receive line items" mode, you scan a barcode and select "Receive"/"Reject"/"Restock". This will update products with status "In transit", or will create a new product if none of these are present.
 *
 * If a non-camera scanner is available is also possible to enable Auto-Scan. In this mode you select a status which all scanned products will be updated to.
 * This is useful if you have a "scan" e.g. on your POS Go or external scanner.
 *
 * A list of actions is shown below the scanner, indicating status changes/new products and quantities. This list can be modified in case of errors.
 * The actions will only be applied when "Apply" is pressed.
 */
export function StockTransferLineItemScanner({
  createStockTransfer,
  dispatch,
}: {
  createStockTransfer: WIPCreateStockTransfer;
  dispatch: CreateStockTransferDispatchProxy;
}) {
  const sources = useScannerSourcesSubscription();
  const shouldShowCamera = sources.length === 1 && sources.includes('camera');
  const autoScanEnabled = sources.length > 0 && !shouldShowCamera;

  const [mode, setMode] = useState<Mode>(MODE.ADD_LINE_ITEMS);
  const [autoScanStatus, setAutoScanStatus] = useState<StockTransferLineItemStatus | null>(null);

  useEffect(() => {
    if (autoScanEnabled) {
      setAutoScanStatus(mode.toStatuses[0] ?? null);
    }
  }, [mode]);

  const [actions, setActions] = useState<Action[]>([]);
  const rows = useActionRows(actions, setActions);

  const { toast } = useApi<'pos.home.modal.render'>();

  const lineItemByInventoryItemIdByStatus = useMemo(() => {
    const availableItemCounts: Record<ID, Record<StockTransferLineItemStatus, StockTransferLineItem[]>> = {};

    for (const lineItem of createStockTransfer.lineItems) {
      const countByStatus = (availableItemCounts[lineItem.inventoryItemId] ??= {
        PENDING: [],
        IN_TRANSIT: [],
        RECEIVED: [],
        REJECTED: [],
      });

      countByStatus[lineItem.status].push(lineItem);
    }

    return availableItemCounts;
  }, [createStockTransfer.lineItems]);

  const [productVariant, setProductVariant] = useState<ProductVariant | null>(null);

  const currentModeScannedProductQuantity =
    mode.fromStatus && productVariant
      ? sum(
          lineItemByInventoryItemIdByStatus[productVariant?.inventoryItem.id]?.[mode.fromStatus]?.map(
            lineItem => lineItem.quantity,
          ) ?? [],
        )
      : 0;

  const currentModeScannedProductActions = actions.filter(
    action => action.inventoryItemId === productVariant?.inventoryItem.id && action.fromStatus === mode.fromStatus,
  );

  const createAction = useCallback(
    (toStatus: StockTransferLineItemStatus, productVariant: ProductVariant) => {
      if (!mode.toStatuses.some(s => s === toStatus)) {
        // this should be impossible to reach since only allowed buttons are shown
        toast.show('Invalid status');
        return;
      }

      setActions(actions => {
        const actionToMerge = actions.find(
          action =>
            action.inventoryItemId === productVariant?.inventoryItem.id &&
            action.fromStatus === mode.fromStatus &&
            action.toStatus === toStatus,
        );
        const quantity = ((actionToMerge?.quantity ?? 0) + 1) as Int;

        if (mode.fromStatus && quantity > currentModeScannedProductQuantity) {
          toast.show(`Not enough ${sentenceCase(mode.fromStatus).toLowerCase()} items available`);
          return actions;
        }

        return [
          {
            inventoryItemId: productVariant.inventoryItem.id,
            fromStatus: mode.fromStatus,
            toStatus,
            quantity,
            productVariantTitle: productVariant.title,
            productTitle: productVariant.product.title,
          },
          ...actions.filter(action => action !== actionToMerge),
        ];
      });
    },
    [mode],
  );

  const applyActions = () => {
    let newCreateStockTransfer: WIPCreateStockTransfer = createStockTransfer;

    for (const action of actions) {
      newCreateStockTransfer = createStockTransferReducer(newCreateStockTransfer, {
        type: 'addLineItems',
        lineItems: [
          {
            uuid: uuid(),
            inventoryItemId: action.inventoryItemId,
            status: action.toStatus,
            quantity: action.quantity,
            productTitle: action.productTitle,
            productVariantTitle: action.productVariantTitle,
            shopifyOrderLineItem: null,
            purchaseOrderLineItem: null,
          },
        ],
      });

      if (action.fromStatus) {
        // we add a line item with negative quantity such that merging automatically merges the negative quantity into existing line items
        newCreateStockTransfer = createStockTransferReducer(newCreateStockTransfer, {
          type: 'addLineItems',
          lineItems: [
            {
              uuid: uuid(),
              inventoryItemId: action.inventoryItemId,
              status: action.fromStatus,
              quantity: -action.quantity as Int,
              productTitle: action.productTitle,
              productVariantTitle: action.productVariantTitle,
              shopifyOrderLineItem: null,
              purchaseOrderLineItem: null,
            },
          ],
        });
      }
    }

    setActions([]);
    dispatch.set(newCreateStockTransfer);

    toast.show('Applied changes!');
  };

  const handleScannedProductVariant = useCallback(
    (variant: ProductVariant) => {
      setProductVariant(variant);

      // If auto-scan is enabled we automatically perform the action to perform.
      if (autoScanStatus !== null) {
        createAction(autoScanStatus, variant);
      }
    },
    [autoScanStatus, createAction],
  );

  const scanStatus = useScannedProductVariantSubscription(handleScannedProductVariant);

  const router = useRouter();

  // conditional `visible` prop does not make banner rerender, so need to do it this way smh
  const scanBanner = (() => {
    if (scanStatus.type === 'NOT_FOUND') {
      return <Banner title={'Product not found'} variant={'error'} visible hideAction />;
    }

    if (scanStatus.type === 'ERROR') {
      return <Banner title={scanStatus.message} variant={'error'} visible hideAction />;
    }

    if (scanStatus.type === 'FETCHING') {
      return <Banner title={'Loading product'} variant={'information'} visible hideAction />;
    }

    if (scanStatus.type === 'IDLE' && !!productVariant) {
      return (
        <Banner
          title={getProductVariantName(productVariant) ?? 'Unknown product'}
          variant={'confirmation'}
          visible
          hideAction
        />
      );
    }

    return <Banner title={'No product scanned'} variant={'information'} visible hideAction />;
  })();

  const notEnoughItems =
    mode.type === 'update' &&
    sum(currentModeScannedProductActions.map(action => action.quantity)) >= currentModeScannedProductQuantity;

  const disableActionButtons = !autoScanEnabled && (!productVariant || notEnoughItems);

  return (
    <ScrollView>
      <ResponsiveStack direction={'vertical'} spacing={2}>
        <SegmentedControl
          segments={Object.values(MODE).map<Segment>(mode => ({
            id: mode.name,
            label: mode.name,
            disabled: false,
          }))}
          onSelect={(mode: string) =>
            setMode(currentMode => Object.values(MODE).find(segmentMode => segmentMode.name === mode) ?? currentMode)
          }
          selected={mode.name}
        />

        {mode.description}

        {scanBanner}
        {shouldShowCamera && <CameraScanner />}

        {notEnoughItems && (
          <Banner
            title={
              mode.fromStatus
                ? `Not enough ${sentenceCase(mode.fromStatus).toLowerCase()} items available`
                : 'Not enough items available'
            }
            variant={'information'}
            visible
            hideAction
          />
        )}

        <ResponsiveGrid columns={2} smColumns={2} grow>
          {mode.toStatuses.map(status => (
            <Button
              key={status}
              title={(autoScanStatus === status ? 'Auto-Scan: ' : '') + sentenceCase(status).toLowerCase()}
              isDisabled={disableActionButtons}
              onPress={() => {
                if (autoScanStatus) {
                  setAutoScanStatus(status);
                  return;
                }

                if (!productVariant) {
                  toast.show('No product scanned');
                  return;
                }

                createAction(status, productVariant);
              }}
            />
          ))}
        </ResponsiveGrid>

        <ResponsiveStack direction={'horizontal'} alignment={'space-between'}>
          <Text variant={'body'}>Actions</Text>
          <Text variant={'body'} color={'TextSubdued'}>
            Click to decrement quantity
          </Text>
        </ResponsiveStack>
        <List data={rows} imageDisplayStrategy={'always'} />
        {rows.length === 0 && (
          <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No actions
            </Text>
          </ResponsiveStack>
        )}

        <ResponsiveStack direction={'vertical'} spacing={1}>
          <Button title={'Discard'} type={'destructive'} onPress={() => router.popCurrent()} />
          <Button
            title={'Save'}
            type={'primary'}
            onPress={() => {
              applyActions();
              router.popCurrent();
            }}
          />
        </ResponsiveStack>
      </ResponsiveStack>
    </ScrollView>
  );
}

const useScannedProductVariantSubscription = (
  onScannedProductVariant: (productVariant: ProductVariant) => void,
): { type: 'FETCHING' | 'NOT_FOUND' | 'IDLE' } | { type: 'ERROR'; message: string } => {
  const fetch = useAuthenticatedFetch({ throwOnError: false });
  const scannerDataSubscribable = useStatefulSubscribableScannerData();
  const [barcode, setBarcode] = useState<string>();

  const productVariantQuery = useProductVariantByBarcodeQuery(
    { fetch, barcode: barcode! },
    { enabled: !!barcode, retry: false },
  );

  useEffect(() => {
    if (productVariantQuery.data && productVariantQuery.data.barcode === barcode) {
      onScannedProductVariant(productVariantQuery.data);
    }

    const unsubscribe = scannerDataSubscribable.subscribe(result => {
      setBarcode(result.data);

      if (productVariantQuery.data && productVariantQuery.data.barcode === result.data) {
        onScannedProductVariant(productVariantQuery.data);
      }
    });

    return () => unsubscribe();
  }, [productVariantQuery.data, onScannedProductVariant]);

  if (productVariantQuery.isFetching) {
    return { type: 'FETCHING' };
  }

  if (productVariantQuery.isError) {
    return { type: 'ERROR', message: extractErrorMessage(productVariantQuery.error, 'Error loading product') };
  }

  if (productVariantQuery.data === null) {
    return { type: 'NOT_FOUND' };
  }

  return { type: 'IDLE' };
};

function useActionRows(actions: Action[], setActions: Dispatch<SetStateAction<Action[]>>): ListRow[] {
  const fetch = useAuthenticatedFetch();

  const inventoryItemIds = unique(actions.map(action => action.inventoryItemId));
  const inventoryItemQueries = useInventoryItemQueries({ fetch, locationId: null, ids: inventoryItemIds });

  return actions.map<ListRow>((action, i) => {
    const inventoryItemQuery = inventoryItemQueries[action.inventoryItemId];

    const label = getProductVariantName(inventoryItemQuery?.data?.variant) ?? 'Unknown product';
    const imageUrl =
      inventoryItemQuery?.data?.variant?.image?.url ?? inventoryItemQuery?.data?.variant?.product?.featuredImage?.url;
    const badges: BadgeProps[] = [];

    if (action.fromStatus) {
      badges.push(getStockTransferLineItemStatusBadgeProps({ status: action.fromStatus }));
    }

    badges.push(getStockTransferLineItemStatusBadgeProps({ status: action.toStatus }));

    return {
      id: String(i),
      leftSide: {
        label,
        badges,
        image: {
          source: imageUrl,
          badge: action.quantity,
        },
      },
      onPress() {
        setActions(actions =>
          actions
            .map(a => (a === action ? { ...a, quantity: (a.quantity - 1) as Int } : a))
            .filter(a => a.quantity > 0),
        );
      },
    };
  });
}

/**
 * Tagged template that combines text with StockTransferLineItemStatus badges.
 */
function textWithBadges(strings: TemplateStringsArray, ...values: StockTransferLineItemStatus[]) {
  return (
    <ResponsiveStack direction={'horizontal'} spacing={0.5} flexWrap={'wrap'} flex={1}>
      {...strings.flatMap((text, i) => {
        const textNode = (
          <Text color={'TextSubdued'} variant={'body'}>
            {text}
          </Text>
        );
        const status = values[i];
        const badgeNode = status ? <Badge {...getStockTransferLineItemStatusBadgeProps({ status })} /> : null;
        return [textNode, badgeNode];
      })}
    </ResponsiveStack>
  );
}
