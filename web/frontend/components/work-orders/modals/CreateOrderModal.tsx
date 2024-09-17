import {
  Badge,
  BlockStack,
  Box,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Spinner,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { useState } from 'react';
import { ToastActionCallable, useAuthenticatedFetch } from '@teifi-digital/shopify-app-react';
import { useCreateWorkOrderOrderMutation } from '@work-orders/common/queries/use-create-work-order-order-mutation.js';
import { DetailedWorkOrder, DetailedWorkOrderCharge, DetailedWorkOrderItem } from '@web/services/work-orders/types.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { workOrderToCreateWorkOrder } from '@work-orders/common/create-work-order/work-order-to-create-work-order.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasNestedPropertyValue, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { useAppBridge } from '@shopify/app-bridge-react';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export function CreateOrderModal({
  open,
  onClose,
  setToastAction,
  workOrder,
}: {
  open: boolean;
  onClose: () => void;
  setToastAction: ToastActionCallable;
  workOrder: DetailedWorkOrder | null;
}) {
  const fetch = useAuthenticatedFetch(setToastAction);
  const app = useAppBridge();

  const createWorkOrderOrderMutation = useCreateWorkOrderOrderMutation({ fetch });

  const calculateWorkOrder = workOrder
    ? pick(
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
      )
    : null;

  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    { fetch, ...calculateWorkOrder! },
    { enabled: !!calculateWorkOrder },
  );

  const [selectedItems, setSelectedItems] = useState<DetailedWorkOrderItem[]>([]);
  const [selectedCharges, setSelectedCharges] = useState<DetailedWorkOrderCharge[]>([]);

  const items = useListItems(
    workOrder,
    calculatedDraftOrderQuery,
    selectedItems,
    selectedCharges,
    setSelectedItems,
    setSelectedCharges,
    setToastAction,
  );

  const currencyFormatter = useCurrencyFormatter({ fetch });

  if (!workOrder) {
    return (
      <Modal open={open} title={'Create Unpaid Order'} onClose={onClose}>
        <Modal.Section>
          <InlineStack align="center">
            <Spinner />
          </InlineStack>
        </Modal.Section>
      </Modal>
    );
  }

  const selectableItems = workOrder.items.filter(
    item => calculatedDraftOrderQuery.getItemLineItem(item)?.order === null,
  );
  const selectableCharges = workOrder.charges.filter(
    charge => calculatedDraftOrderQuery.getChargeLineItem(charge)?.order === null,
  );

  const canChangeSelection = selectableItems.length !== 0 || selectableCharges.length !== 0;
  const isLoading = createWorkOrderOrderMutation.isLoading || calculatedDraftOrderQuery.isLoading;

  return (
    <Modal
      open={open}
      title={'Create Unpaid Order'}
      onClose={onClose}
      primaryAction={{
        content: 'Create Order',
        onAction() {
          createWorkOrderOrderMutation.mutate(
            {
              name: workOrder.name,
              items: selectedItems.map(item => pick(item, 'uuid')),
              charges: selectedCharges.map(charge => pick(charge, 'uuid')),
            },
            {
              onSuccess(result) {
                setToastAction({ content: `Created order ${result.name}!` });
                Redirect.create(app).dispatch(Redirect.Action.ADMIN_PATH, `/orders/${parseGid(result.id).id}`);
              },
            },
          );
        },
        disabled: selectedItems.length === 0,
        loading: isLoading,
      }}
    >
      <Modal.Section>
        <ResourceList
          selectable
          selectedItems={[
            ...selectedItems.map(item => getItemId(item)),
            ...selectedCharges.map(charge => getChargeId(charge)),
          ]}
          onSelectionChange={selection => {
            if (selection === 'All') {
              setSelectedItems(selectableItems);
              setSelectedCharges(selectableCharges);
            } else {
              setSelectedItems(selectableItems.filter(item => selection.includes(getItemId(item))));
              setSelectedCharges(selectableCharges.filter(charge => selection.includes(getChargeId(charge))));
            }
          }}
          loading={isLoading}
          resourceName={{
            singular: 'item',
            plural: 'items',
          }}
          items={items}
          renderItem={({ name, order, disabled, hasCharges, onClick, price, imageUrl, quantity, id, employeeName }) => (
            <ResourceItem
              id={id}
              onClick={onClick}
              disabled={disabled || isLoading}
              name={quantity !== undefined ? `${name} (${quantity})` : name}
            >
              <BlockStack gap={'200'}>
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap={'400'}>
                    {quantity !== undefined && <Badge tone="info">{quantity.toString()}</Badge>}
                    {hasCharges && <Badge tone={'magic'}>Has Additional Labour</Badge>}
                    {imageUrl && <Thumbnail alt={name} source={imageUrl} />}
                  </InlineStack>

                  <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                    {price && currencyFormatter(price)}
                  </Text>
                </InlineStack>

                <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                  {name}
                </Text>
                {order && (
                  <Box>
                    <Badge tone={'info'}>{order}</Badge>
                  </Box>
                )}
                <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                  {employeeName}
                </Text>
              </BlockStack>
            </ResourceItem>
          )}
        />
      </Modal.Section>
    </Modal>
  );
}

function useListItems(
  workOrder: DetailedWorkOrder | null,
  calculatedDraftOrderQuery: ReturnType<typeof useCalculatedDraftOrderQuery>,
  selectedItems: DetailedWorkOrderItem[],
  selectedCharges: DetailedWorkOrderCharge[],
  setSelectedItems: (items: DetailedWorkOrderItem[]) => void,
  setSelectedCharges: (charges: DetailedWorkOrderCharge[]) => void,
  setToastAction: ToastActionCallable,
) {
  const fetch = useAuthenticatedFetch(setToastAction);

  const employeeIds = unique(workOrder?.charges.map(charge => charge.employeeId).filter(isNonNullable) ?? []);
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });

  const calculatedDraftOrder = calculatedDraftOrderQuery.data;

  if (!workOrder || !calculatedDraftOrder) {
    return [];
  }

  type Row = {
    id: string;
    name: string;
    imageUrl: string | undefined;
    quantity: number | undefined;
    order: string | undefined;
    price: Money | undefined | null;
    disabled: boolean;
    onClick: () => void;
    employeeName: string | undefined;
    hasCharges: boolean;
  };

  const itemsWithCharges: Row[] = workOrder.items.flatMap(item => {
    const rows: Row[] = [];

    const itemCharges = workOrder.charges.filter(hasNestedPropertyValue('workOrderItemUuid', item.uuid));
    const itemLineItem = calculatedDraftOrderQuery.getItemLineItem(item);
    const itemPrice = calculatedDraftOrderQuery.getItemPrice(item);

    rows.push({
      id: getItemId(item),
      name: itemLineItem?.name ?? 'Unknown item',
      imageUrl: itemLineItem?.image?.url,
      quantity: itemCharges.length === 0 ? item.quantity : undefined,
      order: itemLineItem?.order?.name,
      price: itemPrice,
      disabled: !itemLineItem || !!itemLineItem.order || !itemPrice,
      onClick: () => {
        if (selectedItems.includes(item)) {
          setSelectedItems(selectedItems.filter(el => el !== item));
        } else {
          setSelectedItems([...selectedItems, item]);
        }
      },
      employeeName: undefined,
      hasCharges: itemCharges.length > 0,
    });

    rows.push(...itemCharges.map(charge => getChargeRow(charge)));

    return rows;
  });

  function getChargeRow(charge: DetailedWorkOrderCharge): Row {
    const employeeQuery = charge.employeeId ? employeeQueries[charge.employeeId] : undefined;
    const employee = employeeQuery?.data;

    let name = charge.name;

    if (charge.workOrderItemUuid !== null) {
      name = `⮑ ${name}`;
    }

    const chargeLineItem = calculatedDraftOrderQuery.getChargeLineItem(charge);
    const chargePrice = calculatedDraftOrderQuery.getChargePrice(charge);

    return {
      id: getChargeId(charge),
      name,
      imageUrl: chargeLineItem?.image?.url,
      quantity: undefined,
      order: chargeLineItem?.order?.name,
      price: chargePrice,
      disabled: !chargeLineItem || !!chargeLineItem.order || !chargePrice,
      onClick: () => {
        if (selectedCharges.includes(charge)) {
          setSelectedCharges(selectedCharges.filter(el => el !== charge));
        } else {
          setSelectedCharges([...selectedCharges, charge]);
        }
      },
      employeeName: employee?.name,
      hasCharges: false,
    };
  }

  const unlinkedCharges = workOrder.charges.filter(hasPropertyValue('workOrderItemUuid', null));
  const unlinkedChargeRows = unlinkedCharges.map(getChargeRow);

  return [...itemsWithCharges, ...unlinkedChargeRows];
}

function getItemId(item: DetailedWorkOrderItem) {
  return `item-${item.uuid}`;
}

function getChargeId(charge: DetailedWorkOrderCharge) {
  return `charge-${charge.type}-${charge.uuid}`;
}
