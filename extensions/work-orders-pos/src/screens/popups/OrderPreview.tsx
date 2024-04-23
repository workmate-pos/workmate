import {
  Button,
  ScrollView,
  Text,
  Badge,
  Stack,
  TextField,
  TextArea,
  List,
  ListRow,
} from '@shopify/retail-ui-extensions-react';
import { useOrderQuery } from '@work-orders/common/queries/use-order-query.js';
import type { ID } from '@web/schemas/generated/ids.js';
import {
  getFinancialStatusBadgeStatus,
  getFinancialStatusBadgeVariant,
  getFulfillmentStatusBadgeStatus,
  getFulfillmentStatusBadgeVariant,
  getStatusText,
} from '../../util/badges.js';
import { Grid } from '../../components/Grid.js';
import { OrderLineItem, useOrderLineItemsQuery } from '@work-orders/common/queries/use-order-line-items-query.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useRouter } from '../../routes.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { defaultCreateWorkOrder } from '../../create-work-order/default.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';

export function OrderPreview({
  orderId,
  showImportButton,
  unsavedChanges,
}: {
  orderId: ID;
  /**
   * Shows "Import Order" button.
   * Only used when importing from an existing order, and should be false when simply viewing the derived from order of a work order.
   */
  showImportButton: boolean;
  /**
   * Whether to warn about unsaved changes when navigating away from this screen.
   */
  unsavedChanges: boolean;
}) {
  const fetch = useAuthenticatedFetch();
  const orderQuery = useOrderQuery({ fetch, id: orderId });
  const orderLineItemsQuery = useOrderLineItemsQuery({ fetch, id: orderId });

  const settingsQuery = useSettingsQuery({ fetch });

  const order = orderQuery.data?.order;

  const router = useRouter();

  const importUnsavedChangesDialog = useUnsavedChangesDialog({
    hasUnsavedChanges: unsavedChanges,
    onAction: () => {
      if (!order) return;
      if (!settingsQuery.data) return;

      router.push('WorkOrder', {
        initial: {
          ...defaultCreateWorkOrder({ status: settingsQuery.data.settings.defaultStatus }),
        },
      });
    },
  });
  const currencyFormatter = useCurrencyFormatter();

  const orderInfo: { label: string; value: string; large?: boolean }[] = [
    ...(order?.customer ? [{ label: 'Customer', value: order.customer.displayName }] : []),
    ...(order
      ? // TODO: On backend make sure this is current values
        [
          ...(order.discount === null ? [] : [{ label: 'Discount', value: currencyFormatter(order.discount) }]),
          ...(order.tax === null ? [] : [{ label: 'Tax', value: currencyFormatter(order.tax) }]),
          { label: 'Total', value: currencyFormatter(order.total) },
          { label: 'Received', value: currencyFormatter(order.received) },
          { label: 'Outstanding', value: currencyFormatter(order.outstanding) },
        ]
      : []),
    ...(order?.note ? [{ label: 'Note', value: order.note, large: true }] : []),
  ];

  const lineItemRows = useLineItemRows(orderLineItemsQuery.data?.pages ?? []);

  const workOrderNames = order?.workOrders.map(workOrder => workOrder.name).join(' • ') ?? '';

  const screen = useScreen();

  screen.setIsLoading(orderQuery.isLoading);
  screen.setTitle(`Order ${[order?.name, workOrderNames].filter(Boolean).join(' - ')}`);

  if (!order) {
    return null;
  }

  return (
    <ScrollView>
      <Stack direction={'vertical'} spacing={2}>
        <Stack direction={'vertical'} spacing={1}>
          <Text variant="headingLarge">Order {order.name}</Text>
          {order.workOrders.length > 0 && <Text variant="body">{workOrderNames}</Text>}
        </Stack>
        <Stack direction={'horizontal'} spacing={2}>
          {order.displayFinancialStatus && (
            <Badge
              text={getStatusText(order.displayFinancialStatus)}
              variant={getFinancialStatusBadgeVariant(order.displayFinancialStatus)}
              status={getFinancialStatusBadgeStatus(order.displayFinancialStatus)}
            />
          )}
          <Badge
            text={getStatusText(order.displayFulfillmentStatus)}
            variant={getFulfillmentStatusBadgeVariant(order.displayFulfillmentStatus)}
            status={getFulfillmentStatusBadgeStatus(order.displayFulfillmentStatus)}
          />
        </Stack>
        <Grid columns={4}>
          {orderInfo.map(
            ({ label, value, large }) =>
              !large && <TextField key={label} label={label} disabled={true} value={value} />,
          )}
        </Grid>
        <Grid columns={1}>
          {orderInfo.map(
            ({ label, value, large }) => large && <TextArea key={label} label={label} disabled={true} value={value} />,
          )}
        </Grid>
        <List
          title={'Products'}
          data={lineItemRows}
          imageDisplayStrategy={'always'}
          isLoadingMore={orderLineItemsQuery.isLoading}
          onEndReached={() => orderLineItemsQuery.fetchNextPage()}
        />
        {orderLineItemsQuery.isLoading && (
          <Stack direction="horizontal" alignment="center" flex={1} paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              Loading line items...
            </Text>
          </Stack>
        )}
        {orderLineItemsQuery.isSuccess && lineItemRows.length === 0 && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text variant="body" color="TextSubdued">
              No line items found
            </Text>
          </Stack>
        )}
        {orderLineItemsQuery.isError && (
          <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
            <Text color="TextCritical" variant="body">
              {extractErrorMessage(orderLineItemsQuery.error, 'Error loading line items')}
            </Text>
          </Stack>
        )}
        {showImportButton && (
          <Stack direction="vertical" flex={1} alignment="flex-end">
            <Button title={'Import'} onPress={importUnsavedChangesDialog.show}></Button>
          </Stack>
        )}
      </Stack>
    </ScrollView>
  );
}

function useLineItemRows(lineItems: OrderLineItem[]): ListRow[] {
  const currencyFormatter = useCurrencyFormatter();

  return lineItems.map<ListRow>(lineItem => {
    return {
      id: lineItem.id,
      leftSide: {
        label: lineItem.title,
        subtitle: lineItem?.sku ? [lineItem.sku] : undefined,
        image: {
          source: lineItem.variant?.image?.url ?? lineItem?.variant?.product?.featuredImage?.url,
          badge: lineItem.quantity > 1 ? lineItem.quantity : undefined,
        },
      },
      rightSide: {
        label: currencyFormatter(
          BigDecimal.fromMoney(lineItem.originalUnitPrice)
            .multiply(BigDecimal.fromString(lineItem.quantity.toFixed(0)))
            .toMoney(),
        ),
      },
    };
  });
}
