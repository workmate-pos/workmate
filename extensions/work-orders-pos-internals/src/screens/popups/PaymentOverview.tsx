import { Button, List, ListRow, ScrollView, Stack, Text, useExtensionApi } from '@shopify/retail-ui-extensions-react';
import { usePaymentHandler } from '../../hooks/use-payment-handler.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { WorkOrder, WorkOrderCharge, WorkOrderItem } from '@web/services/work-orders/types.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { workOrderToCreateWorkOrder } from '../../dto/work-order-to-create-work-order.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';

/**
 * Page that allows initializing payments for line items.
 * Also shows items that are already in an order, and their payment status.
 */
export function PaymentOverview({ name }: { name: string }) {
  const fetch = useAuthenticatedFetch();

  const workOrderQuery = useWorkOrderQuery({ fetch, name });
  const workOrder = workOrderQuery.data?.workOrder;

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  const calculateWorkOrder = workOrder
    ? pick(workOrderToCreateWorkOrder(workOrder), 'name', 'items', 'charges', 'discount', 'customerId')
    : null;

  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      ...calculateWorkOrder!,
    },
    { enabled: !!calculateWorkOrder },
  );

  const [selectedItems, setSelectedItems] = useState<WorkOrderItem[]>([]);
  const [selectedCharges, setSelectedCharges] = useState<WorkOrderCharge[]>([]);

  const paymentHandler = usePaymentHandler();
  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const screen = useScreen();
  screen.setTitle(`Payment Overview - ${name}`);
  screen.setIsLoading(workOrderQuery.isLoading || settingsQuery.isLoading || calculatedDraftOrderQuery.isLoading);

  const rows = useItemRows(
    workOrder ?? null,
    calculatedDraftOrderQuery,
    selectedItems,
    selectedCharges,
    setSelectedItems,
    setSelectedCharges,
    paymentHandler.isLoading,
  );

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

  if (calculatedDraftOrderQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(calculatedDraftOrderQuery.error, 'An error occurred while loading item details')}
        </Text>
      </Stack>
    );
  }

  if (!workOrder || !settings || !calculatedDraftOrderQuery.data) {
    return null;
  }

  const pay = () => {
    if (selectedItems.length === 0 && selectedCharges.length === 0) {
      toast.show('You must select at least one item or charge to pay for');
      return;
    }

    paymentHandler.handlePayment({
      workOrderName: workOrder.name,
      customFields: workOrder.customFields,
      items: selectedItems,
      charges: selectedCharges,
      customerId: workOrder.customerId,
      labourSku: settings.labourLineItemSKU,
      discount: workOrder.discount,
    });
  };

  const selectableItems = workOrder.items.filter(
    item => calculatedDraftOrderQuery.getItemLineItem(item.uuid)?.order === null,
  );
  const selectableCharges = workOrder.charges.filter(
    charge => calculatedDraftOrderQuery.getChargeLineItem(charge)?.order === null,
  );

  // TODO: Display total

  const canChangeSelection = selectableItems.length !== 0 || selectableCharges.length !== 0;

  return (
    <ScrollView>
      {selectedItems.length === selectableItems.length && selectedCharges.length === selectableCharges.length ? (
        <Button
          title={'Deselect all items'}
          isDisabled={paymentHandler.isLoading || !canChangeSelection}
          type={'plain'}
          onPress={() => {
            setSelectedItems([]);
            setSelectedCharges([]);
          }}
        />
      ) : (
        <Button
          title={'Select all items'}
          isDisabled={paymentHandler.isLoading || !canChangeSelection}
          type={'plain'}
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
  workOrder: WorkOrder | null,
  calculatedDraftOrderQuery: ReturnType<typeof useCalculatedDraftOrderQuery>,
  selectedItems: WorkOrderItem[],
  selectedCharges: WorkOrderCharge[],
  setSelectedItems: (items: WorkOrderItem[]) => void,
  setSelectedCharges: (charges: WorkOrderCharge[]) => void,
  isLoadingPayment: boolean,
) {
  const fetch = useAuthenticatedFetch();

  const employeeIds = unique(workOrder?.charges.map(charge => charge.employeeId).filter(isNonNullable) ?? []);
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });

  const screen = useScreen();
  screen.setIsLoading(Object.values(employeeQueries).some(query => query.isLoading));

  const { toast } = useExtensionApi<'pos.home.modal.render'>();
  const currencyFormatter = useCurrencyFormatter();

  const calculatedDraftOrder = calculatedDraftOrderQuery.data;

  if (!workOrder || !calculatedDraftOrder) {
    return [];
  }

  const itemRows = workOrder.items.flatMap<ListRow>(item => {
    const rows: ListRow[] = [];

    const itemCharges = workOrder.charges.filter(hasPropertyValue('workOrderItemUuid', item.uuid));
    const itemLineItem = calculatedDraftOrderQuery.getItemLineItem(item.uuid);
    const itemPrice = calculatedDraftOrder.itemPrices[item.uuid];

    rows.push({
      id: `item-${item.uuid}`,
      leftSide: {
        label: itemLineItem?.name ?? 'Unknown item',
        image: {
          source: itemLineItem?.image?.url,
          badge: itemCharges.length === 0 ? item.quantity : undefined,
        },
        badges: [itemLineItem?.order].filter(isNonNullable).map(order => ({ text: order.name, variant: 'highlight' })),
        subtitle: itemPrice ? [currencyFormatter(itemPrice)] : ['Unknown price'],
      },
      rightSide: {
        toggleSwitch: {
          value: selectedItems.includes(item),
          disabled: isLoadingPayment || !itemLineItem || !!itemLineItem.order || !itemPrice,
        },
      },
      onPress() {
        if (!itemLineItem || !itemPrice) {
          toast.show('Cannot select item: could not load line item details');
          return;
        }

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

    let label = charge.name;

    if (charge.workOrderItemUuid) {
      label = `⮑ ${label}`;
    }

    const chargeLineItem = calculatedDraftOrderQuery.getChargeLineItem(charge);
    const chargePrice = calculatedDraftOrderQuery.getChargePrice(charge);
    const formattedPrice = chargePrice ? currencyFormatter(chargePrice) : 'Unknown price';

    return {
      id: `charge-${charge.type}-${charge.uuid}`,
      leftSide: {
        label,
        subtitle: charge.employeeId ? [formattedPrice, employee?.name ?? 'Unnamed employee'] : [formattedPrice],
        badges: [chargeLineItem?.order]
          .filter(isNonNullable)
          .map(order => ({ text: order.name, variant: 'highlight' })),
      },
      rightSide: {
        toggleSwitch: {
          value: selectedCharges.includes(charge),
          disabled: isLoadingPayment || !chargeLineItem || !!chargeLineItem.order || !chargePrice,
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
