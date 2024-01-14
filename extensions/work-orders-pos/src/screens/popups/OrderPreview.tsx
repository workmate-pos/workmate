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
import { useState } from 'react';
import { useScreen } from '../../hooks/use-screen.js';
import { useAuthenticatedFetch } from '../../hooks/use-authenticated-fetch.js';
import { useUnsavedChangesDialog } from '../../providers/UnsavedChangesDialogProvider.js';
import {
  getFinancialStatusBadgeStatus,
  getFinancialStatusBadgeVariant,
  getFulfillmentStatusBadgeStatus,
  getFulfillmentStatusBadgeVariant,
  getStatusText,
} from '../../util/badges.js';
import { Grid } from '../../components/Grid.js';
import { useCurrencyFormatter } from '../../hooks/use-currency-formatter.js';
import { OrderLineItem, useOrderLineItemsQuery } from '@work-orders/common/queries/use-order-line-items-query.js';
import { parseMoney } from '@work-orders/common/util/money.js';

export function OrderPreview() {
  const [orderId, setOrderId] = useState<ID | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showImportButton, setShowImportButton] = useState(false);

  const { Screen, navigate } = useScreen('OrderPreview', ({ orderId, unsavedChanges, showImportButton }) => {
    setOrderId(orderId);
    setUnsavedChanges(unsavedChanges);
    setShowImportButton(showImportButton);
  });

  const fetch = useAuthenticatedFetch();
  // TODO: Change default keepPreviousData to false & add it where needed (mostly search lists)
  const orderQuery = useOrderQuery({ fetch, id: orderId }, { keepPreviousData: false });
  const orderLineItemsQuery = useOrderLineItemsQuery({ fetch, id: orderId });

  const order = orderQuery.data?.order;

  const unsavedChangesDialog = useUnsavedChangesDialog();
  const currencyFormatter = useCurrencyFormatter();

  const orderInfo: { label: string; value: string; large?: boolean }[] = [
    ...(order?.customer ? [{ label: 'Customer', value: order.customer.displayName }] : []),
    ...(order
      ? [
          { label: 'Discount', value: currencyFormatter(order.discount) },
          { label: 'Tax', value: currencyFormatter(order.tax) },
          { label: 'Total', value: currencyFormatter(order.total) },
          { label: 'Received', value: currencyFormatter(order.received) },
          { label: 'Outstanding', value: currencyFormatter(order.outstanding) },
        ]
      : []),
    ...(order?.note ? [{ label: 'Note', value: order.note, large: true }] : []),
  ];

  const lineItemRows = useLineItemRows(orderLineItemsQuery.data?.pages ?? []);

  return (
    <Screen
      title={`Order ${[order?.name, order?.workOrder?.name].filter(Boolean).join(' - ')}`}
      isLoading={orderQuery.isLoading}
      presentation={{ sheet: true }}
    >
      <Text>{JSON.stringify(orderQuery.status)}</Text>
      <Text>{JSON.stringify(orderQuery.data)}</Text>
      <Text>{JSON.stringify(orderQuery.error)}</Text>
      {order && (
        <ScrollView>
          <Stack direction={'vertical'} spacing={2}>
            <Stack direction={'vertical'} spacing={1}>
              <Text variant="headingLarge">Order {order.name}</Text>
              {order.workOrder && <Text variant="body">Work Order {order.workOrder.name}</Text>}
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
                ({ label, value, large }) => !large && <TextField label={label} disabled={true} value={value} />,
              )}
            </Grid>
            <Grid columns={1}>
              {orderInfo.map(
                ({ label, value, large }) => large && <TextArea label={label} disabled={true} value={value} />,
              )}
            </Grid>
            <List
              title={'Products'}
              data={lineItemRows}
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
            {showImportButton && (
              <Stack direction="vertical" flex={1} alignment="flex-end">
                <Button
                  title={'Import'}
                  onPress={() =>
                    unsavedChangesDialog.show({
                      onAction: () => {
                        if (!order.workOrder) return;
                        navigate('WorkOrder', {
                          type: 'new-work-order',
                          initial: {
                            customerId: order.customer?.id ?? null,
                            derivedFromOrderId: order.id,
                          },
                        });
                      },
                      skipDialog: !unsavedChanges,
                    })
                  }
                ></Button>
              </Stack>
            )}
          </Stack>
        </ScrollView>
      )}
    </Screen>
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
          source: lineItem.variant?.image?.url ?? lineItem?.variant?.product?.featuredImage?.url ?? 'not found',
          badge: lineItem.quantity > 1 ? lineItem.quantity : undefined,
        },
      },
      rightSide: {
        label: currencyFormatter(parseMoney(lineItem.originalUnitPrice) * lineItem.quantity),
      },
    };
  });
}
