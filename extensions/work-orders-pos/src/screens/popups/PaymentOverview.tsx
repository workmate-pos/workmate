import { Button, List, ListRow, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { usePaymentHandler } from '../../hooks/use-payment-handler.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { WorkOrderCharge, WorkOrderItem } from '@web/services/work-orders/types.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useWorkOrderOrders } from '../../hooks/use-work-order-orders.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { workOrderToCreateWorkOrder } from '../../dto/work-order-to-create-work-order.js';
import { defaultCreateWorkOrder } from '../../create-work-order/default.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';

/**
 * Page that allows initializing payments for line items.
 * Also shows items that are already in an order, and their payment status.
 */
export function PaymentOverview({ name }: { name: string }) {
  const fetch = useAuthenticatedFetch();

  const { workOrderQuery, getItemOrder, getChargeOrder } = useWorkOrderOrders(name);
  const workOrder = workOrderQuery.data?.workOrder;

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  const [selectedItems, setSelectedItems] = useState<WorkOrderItem[]>([]);
  const [selectedCharges, setSelectedCharges] = useState<WorkOrderCharge[]>([]);

  const paymentHandler = usePaymentHandler();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const screen = useScreen();
  screen.setTitle(`Payment Overview - ${name}`);
  screen.setIsLoading(workOrderQuery.isLoading || settingsQuery.isLoading);

  if (workOrderQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(workOrderQuery.error, `An error occurred while loading work order ${name}`)}
        </Text>
      </Stack>
    );
  }

  if (settingsQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(settingsQuery.error, 'An error occurred while loading settings')}
        </Text>
      </Stack>
    );
  }

  if (!workOrder || !settings) {
    return null;
  }

  const pay = () => {
    if (selectedItems.length === 0 && selectedCharges.length === 0) {
      toast.show('You must select at least one item or charge to pay for');
      return;
    }

    paymentHandler.handlePayment({
      workOrderName: workOrder.name,
      items: selectedItems,
      charges: selectedCharges,
      customerId: workOrder.customerId,
      labourSku: settings.labourLineItemSKU,
    });
  };

  const rows = useItemRows(
    workOrder.name,
    selectedItems,
    selectedCharges,
    setSelectedItems,
    setSelectedCharges,
    paymentHandler.isLoading,
  );

  const selectableItems = workOrder.items.filter(item => getItemOrder(item)?.type !== 'ORDER');
  const selectableCharges = workOrder.charges.filter(charge => getChargeOrder(charge)?.type !== 'ORDER');

  // TODO: Display total

  const canSelectItems = selectedItems.length !== 0 || selectedCharges.length !== 0;

  return (
    <ScrollView>
      {selectedItems.length === selectableItems.length && selectedCharges.length === selectableCharges.length ? (
        <Button
          title={'Deselect all items'}
          isDisabled={paymentHandler.isLoading}
          type={'plain'}
          disabled={!canSelectItems}
          onPress={() => {
            setSelectedItems([]);
            setSelectedCharges([]);
          }}
        />
      ) : (
        <Button
          title={'Select all items'}
          isDisabled={paymentHandler.isLoading}
          type={'plain'}
          disabled={!canSelectItems}
          onPress={() => {
            setSelectedItems(selectableItems);
            setSelectedCharges(selectableCharges);
          }}
        />
      )}
      <ResponsiveStack direction={'vertical'} paddingVertical={'Medium'}>
        <List data={rows} imageDisplayStrategy={'always'} isLoadingMore={false} onEndReached={() => {}} />
      </ResponsiveStack>
      <Button
        title={'Create Payment'}
        isLoading={paymentHandler.isLoading}
        isDisabled={selectedItems.length === 0 && selectedCharges.length === 0}
        onPress={() => pay()}
        type={'primary'}
      />
    </ScrollView>
  );
}

function useItemRows(
  workOrderName: string,
  selectedItems: WorkOrderItem[],
  selectedCharges: WorkOrderCharge[],
  setSelectedItems: (items: WorkOrderItem[]) => void,
  setSelectedCharges: (charges: WorkOrderCharge[]) => void,
  isLoadingPayment: boolean,
) {
  const fetch = useAuthenticatedFetch();
  const currencyFormatter = useCurrencyFormatter();

  const { workOrderQuery, getItemOrder, getChargeOrder } = useWorkOrderOrders(workOrderName);
  const workOrder = workOrderQuery.data?.workOrder;

  const productVariantIds = unique(workOrder?.items?.map(item => item.productVariantId) ?? []);
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const employeeIds = unique(workOrder?.charges.map(charge => charge.employeeId).filter(isNonNullable) ?? []);
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });

  const { customerId, items, charges } = workOrder
    ? workOrderToCreateWorkOrder(workOrder)
    : defaultCreateWorkOrder({ status: 'N/A' });

  const calculateAllQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      name: workOrderName,
      items,
      charges,
      customerId: customerId ?? createGid('Customer', '0'),
    },
    {
      enabled: !!workOrder,
    },
  );
  const calculateAll = calculateAllQuery.data;

  // we need a separate calculation for the current selection to properly deal with absorbed charges
  const calculateSelectionQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      name: workOrderName,
      items: items.filter(item => selectedItems.some(hasPropertyValue('uuid', item.uuid))),
      charges: charges.filter(charge => selectedCharges.some(hasPropertyValue('uuid', charge.uuid))),
      customerId: customerId ?? createGid('Customer', '0'),
    },
    {
      enabled: !!workOrder,
    },
  );
  const calculateSelection = calculateSelectionQuery.data;

  const screen = useScreen();
  screen.setIsLoading(workOrderQuery.isLoading || Object.values(employeeQueries).some(q => q.isLoading));

  if (!workOrder) {
    return [];
  }

  const itemRows = workOrder.items.flatMap<ListRow>(item => {
    const rows: ListRow[] = [];

    const itemCharges = workOrder.charges.filter(hasPropertyValue('workOrderItemUuid', item.uuid));
    const hasCharges = itemCharges.length > 0;

    const itemProductVariantQuery = productVariantQueries[item.productVariantId];
    const productVariant = itemProductVariantQuery?.data;

    const price = calculateSelection?.itemPrices?.[item.uuid] ?? calculateAll?.itemPrices?.[item.uuid];
    const formattedPrice = price ? currencyFormatter(price) : '⟳';

    rows.push({
      id: `item-${item.uuid}`,
      leftSide: {
        label: getProductVariantName(productVariant) ?? 'Unknown item',
        image: {
          source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
          badge: hasCharges ? undefined : item.quantity,
        },
        badges: [getItemOrder(item)]
          .filter(isNonNullable)
          .filter(order => order?.type === 'ORDER')
          .map(order => ({ text: order.name, variant: 'highlight' })),
        subtitle: [formattedPrice],
      },
      rightSide: {
        toggleSwitch: {
          value: selectedItems.includes(item),
          disabled: isLoadingPayment || getItemOrder(item)?.type === 'ORDER',
        },
      },
      onPress() {
        if (selectedItems.includes(item)) {
          setSelectedItems(selectedItems.filter(el => el !== item));
        } else {
          setSelectedItems([...selectedItems, item]);
        }
      },
    });

    rows.push(...itemCharges.map(charge => getChargeRow(charge)));

    return rows;
  });

  const unlinkedCharges = workOrder.charges.filter(hasPropertyValue('workOrderItemUuid', null));

  const unlinkedChargeRows = unlinkedCharges.map<ListRow>(charge => getChargeRow(charge));

  function getChargeRow(charge: WorkOrderCharge): ListRow {
    const employeeQuery = charge.employeeId ? employeeQueries[charge.employeeId] : undefined;
    const employee = employeeQuery?.data;

    const selectionChargePricesKey = (
      { 'hourly-labour': 'hourlyLabourChargePrices', 'fixed-price-labour': 'fixedPriceLabourChargePrices' } as const
    )[charge.type];

    const price =
      calculateSelection?.[selectionChargePricesKey]?.[charge.uuid] ??
      calculateAll?.[selectionChargePricesKey]?.[charge.uuid];

    const formattedPrice = price ? currencyFormatter(price) : '⟳';

    let label = charge.name;

    if (charge.workOrderItemUuid) {
      label = `⮑ ${label}`;
    }

    return {
      id: `charge-${charge.type}-${charge.uuid}`,
      leftSide: {
        label,
        subtitle: charge.employeeId ? [formattedPrice, employee?.name ?? 'Unnamed employee'] : [formattedPrice],
        badges: [getChargeOrder(charge)]
          .filter(isNonNullable)
          .filter(order => order?.type === 'ORDER')
          .map(order => ({ text: order.name, variant: 'highlight' })),
      },
      rightSide: {
        toggleSwitch: {
          value: selectedCharges.includes(charge),
          disabled: isLoadingPayment || getChargeOrder(charge)?.type === 'ORDER',
        },
      },
      onPress() {
        if (selectedCharges.includes(charge)) {
          setSelectedCharges(selectedCharges.filter(el => el !== charge));
        } else {
          setSelectedCharges([...selectedCharges, charge]);
        }
      },
    };
  }

  return [...itemRows, ...unlinkedChargeRows];
}
