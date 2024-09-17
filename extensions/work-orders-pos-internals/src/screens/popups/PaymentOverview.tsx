import {
  Badge,
  Button,
  List,
  ListRow,
  ScrollView,
  Stack,
  Text,
  useApi,
} from '@shopify/ui-extensions-react/point-of-sale';
import { usePaymentHandler } from '../../hooks/use-payment-handler.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useState } from 'react';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { DetailedWorkOrder, DetailedWorkOrderCharge, DetailedWorkOrderItem } from '@web/services/work-orders/types.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { hasNestedPropertyValue, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { workOrderToCreateWorkOrder } from '@work-orders/common/create-work-order/work-order-to-create-work-order.js';
import { useCreateWorkOrderOrderMutation } from '@work-orders/common/queries/use-create-work-order-order-mutation.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { useRouter } from '../../routes.js';
import { Fetch } from '@work-orders/common/queries/fetch.js';
import { usePlanWorkOrderOrderQuery } from '@work-orders/common/queries/use-plan-work-order-order-query.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

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

  const createWorkOrderOrderMutation = useCreateWorkOrderOrderMutation({ fetch });

  const [selectedItems, setSelectedItems] = useState<DetailedWorkOrderItem[]>([]);
  const [selectedCharges, setSelectedCharges] = useState<DetailedWorkOrderCharge[]>([]);

  const calculateWorkOrderQuery = useCalculateWorkOrder({ fetch, workOrder });
  const planOrderQuery = usePlanOrder({ fetch, workOrder, selectedItems, selectedCharges });

  const paymentHandler = usePaymentHandler();
  const { toast } = useApi<'pos.home.modal.render'>();

  const isLoading = paymentHandler.isLoading || createWorkOrderOrderMutation.isPending;

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(`Payment Overview - ${name}`);
  screen.setIsLoading(
    workOrderQuery.isFetching || calculateWorkOrderQuery.isFetching || settingsQuery.isFetching || isLoading,
  );

  const rows = useItemRows(
    workOrder ?? null,
    calculateWorkOrderQuery,
    selectedItems,
    selectedCharges,
    setSelectedItems,
    setSelectedCharges,
    isLoading,
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

  if (calculateWorkOrderQuery.isError) {
    return (
      <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
        <Text color="TextCritical" variant="body">
          {extractErrorMessage(calculateWorkOrderQuery.error, 'An error occurred while loading item details')}
        </Text>
      </Stack>
    );
  }

  if (!workOrder || !settings || !calculateWorkOrderQuery.data) {
    return null;
  }

  const pay = () => {
    if (planOrderQuery.isFetching) {
      toast.show('Calculating work order...');
      return;
    }

    if (!planOrderQuery.data) {
      toast.show('Could not calculate work order');
      return;
    }

    if (!planOrderQuery.data.lineItems?.length) {
      toast.show('No items to pay for');
      return;
    }

    paymentHandler.handlePayment(planOrderQuery.data);
  };

  const createOrder = () => {
    if (selectedItems.length === 0 && selectedCharges.length === 0) {
      toast.show('You must select at least one item or charge to create an order');
      return;
    }

    createWorkOrderOrderMutation.mutate(
      {
        name: workOrder.name,
        items: selectedItems.map(item => pick(item, 'uuid')),
        charges: selectedCharges.map(charge => pick(charge, 'uuid')),
      },
      {
        onSuccess(result) {
          router.popCurrent();
          toast.show(`Created order ${result.name}!`);
        },
      },
    );
  };

  const selectableItems = workOrder.items.filter(item => calculateWorkOrderQuery.getItemLineItem(item)?.order === null);
  const selectableCharges = workOrder.charges.filter(
    charge => calculateWorkOrderQuery.getChargeLineItem(charge)?.order === null,
  );

  // TODO: Display total

  const canChangeSelection = selectableItems.length !== 0 || selectableCharges.length !== 0;

  let financialStatus = undefined;

  const { outstanding, total } = calculateWorkOrderQuery.data;

  const outstandingBigDecimal = BigDecimal.fromMoney(outstanding);
  const totalBigDecimal = BigDecimal.fromMoney(total);

  if (outstandingBigDecimal.compare(BigDecimal.ZERO) <= 0) {
    financialStatus = 'Fully Paid';
  } else if (outstandingBigDecimal.compare(totalBigDecimal) < 0) {
    financialStatus = 'Partially paid';
  } else {
    financialStatus = 'Unpaid';
  }

  return (
    <ScrollView>
      <ResponsiveStack direction={'vertical'} spacing={2}>
        <Badge text={financialStatus} variant={'highlight'} />
        {financialStatus === 'Partially paid' && (
          <Text variant={'body'} color={'TextSubdued'}>
            {workOrder.name} is partially paid. To pay the outstanding balance of products that have been partially
            paid, please navigate to the respective Shopify Order (e.g. via the Orders tab outside of WorkMate).
          </Text>
        )}

        {selectedItems.length === selectableItems.length && selectedCharges.length === selectableCharges.length ? (
          <Button
            title={'Deselect all items'}
            isDisabled={isLoading || !canChangeSelection}
            type={'plain'}
            onPress={() => {
              setSelectedItems([]);
              setSelectedCharges([]);
            }}
          />
        ) : (
          <Button
            title={'Select all items'}
            isDisabled={isLoading || !canChangeSelection}
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
        <ResponsiveGrid columns={2}>
          {!!workOrder.companyId && (
            <Button
              title={'Create Order'}
              isLoading={createWorkOrderOrderMutation.isPending}
              isDisabled={isLoading || !planOrderQuery.data || !planOrderQuery.data.lineItems?.length}
              onPress={() => createOrder()}
              type={'primary'}
            />
          )}

          {!workOrder.companyId && (
            <Button
              title={'Create Payment'}
              isLoading={planOrderQuery.isFetching || paymentHandler.isLoading}
              isDisabled={
                isLoading || !!workOrder.companyId || !planOrderQuery.data || !planOrderQuery.data.lineItems?.length
              }
              onPress={() => pay()}
              type={'primary'}
            />
          )}
        </ResponsiveGrid>
      </ResponsiveStack>
    </ScrollView>
  );
}

function useItemRows(
  workOrder: DetailedWorkOrder | null,
  calculatedDraftOrderQuery: ReturnType<typeof useCalculatedDraftOrderQuery>,
  selectedItems: DetailedWorkOrderItem[],
  selectedCharges: DetailedWorkOrderCharge[],
  setSelectedItems: (items: DetailedWorkOrderItem[]) => void,
  setSelectedCharges: (charges: DetailedWorkOrderCharge[]) => void,
  isLoading: boolean,
) {
  const fetch = useAuthenticatedFetch();

  const employeeIds = unique(workOrder?.charges.map(charge => charge.employeeId).filter(isNonNullable) ?? []);
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });

  const screen = useScreen();
  screen.setIsLoading(Object.values(employeeQueries).some(query => query.isLoading));

  const { toast } = useApi<'pos.home.modal.render'>();
  const currencyFormatter = useCurrencyFormatter();

  const calculatedDraftOrder = calculatedDraftOrderQuery.data;

  if (!workOrder || !calculatedDraftOrder) {
    return [];
  }

  const itemRows = workOrder.items.flatMap<ListRow>(item => {
    const rows: ListRow[] = [];

    const itemLineItem = calculatedDraftOrderQuery.getItemLineItem(item);
    const itemPrice = calculatedDraftOrderQuery.getItemPrice(item);
    const itemCharges = workOrder.charges.filter(hasPropertyValue('workOrderItemUuid', item.uuid));

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
          disabled: isLoading || !itemLineItem || !!itemLineItem.order || !itemPrice,
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

  function getChargeRow(charge: DetailedWorkOrderCharge): ListRow {
    const employeeQuery = charge.employeeId ? employeeQueries[charge.employeeId] : undefined;
    const employee = employeeQuery?.data;

    let label = charge.name;

    if (charge.workOrderItemUuid !== null) {
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
          disabled: isLoading || !chargeLineItem || !!chargeLineItem.order || !chargePrice,
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

const useCalculateWorkOrder = ({ fetch, workOrder }: { fetch: Fetch; workOrder?: DetailedWorkOrder | null }) => {
  const calculateWorkOrder = workOrder
    ? {
        ...pick(
          workOrderToCreateWorkOrder(workOrder),
          'name',
          'items',
          'charges',
          'discount',
          'customerId',
          'companyLocationId',
          'companyContactId',
          'companyId',
          'paymentTerms',
        ),
      }
    : null;

  return useCalculatedDraftOrderQuery(
    {
      fetch,
      ...calculateWorkOrder!,
    },
    { enabled: !!calculateWorkOrder },
  );
};

const usePlanOrder = ({
  fetch,
  workOrder,
  selectedItems,
  selectedCharges,
}: {
  fetch: Fetch;
  workOrder?: DetailedWorkOrder | null;
  selectedItems: DetailedWorkOrderItem[];
  selectedCharges: DetailedWorkOrderCharge[];
}) => {
  return usePlanWorkOrderOrderQuery(
    {
      fetch,
      name: workOrder?.name!,
      items: selectedItems,
      charges: selectedCharges,
    },
    { enabled: !!workOrder?.name },
  );
};
