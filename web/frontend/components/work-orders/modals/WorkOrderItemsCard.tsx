import { CreateWorkOrderDispatchProxy, WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  InlineStack,
  ResourceItem,
  ResourceList,
  Spinner,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { CreateWorkOrder, Int } from '@web/schemas/generated/create-work-order.js';
import { useState } from 'react';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { hasNestedPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { WorkOrderItemModal } from '@web/frontend/components/work-orders/modals/WorkOrderItemModal.js';
import { WorkOrder } from '@web/services/work-orders/types.js';

export function WorkOrderItemsCard({
  createWorkOrder,
  workOrder,
  dispatch,
  disabled,
  onAddProductClick,
  onAddServiceClick,
  isLoading,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  workOrder: WorkOrder | null;
  dispatch: CreateWorkOrderDispatchProxy;
  disabled: boolean;
  onAddProductClick: () => void;
  onAddServiceClick: () => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <BlockStack gap={'400'}>
        <InlineStack align={'space-between'}>
          <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
            Items
          </Text>
          <Box>{isLoading && <Spinner size={'small'} />}</Box>
        </InlineStack>
        <ProductsList createWorkOrder={createWorkOrder} dispatch={dispatch} workOrder={workOrder} disabled={disabled} />
        <ButtonGroup fullWidth>
          <Button onClick={() => onAddProductClick()} disabled={disabled}>
            Add Product
          </Button>
          <Button onClick={() => onAddServiceClick()} disabled={disabled}>
            Add Service
          </Button>
        </ButtonGroup>
      </BlockStack>
    </Card>
  );
}

function ProductsList({
  createWorkOrder,
  workOrder,
  dispatch,
  disabled,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  workOrder: WorkOrder | null;
  dispatch: CreateWorkOrderDispatchProxy;
  disabled: boolean;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      ...pick(
        createWorkOrder,
        'name',
        'customerId',
        'items',
        'charges',
        'discount',
        'companyLocationId',
        'companyId',
        'companyContactId',
      ),
    },
    { enabled: false, keepPreviousData: true },
  );

  const [modalItem, setModalItem] = useState<CreateWorkOrder['items'][number] | null>(null);

  const onItemClick = (item: CreateWorkOrder['items'][number]) => {
    if (disabled) return;
    setModalItem(item);
  };

  const onItemRemove = (item: CreateWorkOrder['items'][number]) => {
    dispatch.updateItem({ item: { ...item, quantity: 0 as Int } });
  };

  return (
    <>
      <ResourceList
        items={createWorkOrder.items}
        loading={calculatedDraftOrderQuery.isLoading}
        resourceName={{ singular: 'product', plural: 'products' }}
        resolveItemId={item => item.uuid}
        renderItem={item => {
          const itemLineItemId = (() => {
            if (item.type === 'product') {
              return calculatedDraftOrderQuery.data?.itemLineItemIds[item.uuid];
            }

            if (item.type === 'custom-item') {
              return calculatedDraftOrderQuery.data?.customItemLineItemIds[item.uuid];
            }

            return item satisfies never;
          })();
          const itemLineItem = calculatedDraftOrderQuery.data?.lineItems.find(li => li.id === itemLineItemId);

          const canRemove = !!itemLineItem?.order;

          const name = getProductVariantName(itemLineItem?.variant) ?? 'Unknown Product';
          const imageUrl = itemLineItem?.image?.url;

          const charges = createWorkOrder.charges
            .filter(hasNestedPropertyValue('workOrderItem.type', item.type))
            .filter(hasNestedPropertyValue('workOrderItem.uuid', item.uuid));

          const itemPrice = (() => {
            if (item.type === 'product') {
              return calculatedDraftOrderQuery.data?.itemPrices[item.uuid];
            }

            if (item.type === 'custom-item') {
              return calculatedDraftOrderQuery.data?.customItemPrices[item.uuid];
            }

            return item satisfies never;
          })();

          const chargePrices = charges.map(charge => {
            if (charge.type === 'hourly-labour') {
              return calculatedDraftOrderQuery.data?.hourlyLabourChargePrices[charge.uuid];
            } else if (charge.type === 'fixed-price-labour') {
              return calculatedDraftOrderQuery.data?.fixedPriceLabourChargePrices[charge.uuid];
            }

            return charge satisfies never;
          });

          const totalPrice = BigDecimal.sum(
            ...[itemPrice, ...chargePrices].filter(isNonNullable).map(price => BigDecimal.fromMoney(price)),
          ).toMoney();

          const hasCharges = charges.length > 0;

          return (
            <ResourceItem
              id={item.uuid}
              onClick={() => onItemClick(item)}
              disabled={disabled}
              shortcutActions={canRemove ? [{ content: 'Remove', onAction: () => onItemRemove(item) }] : []}
            >
              <BlockStack gap={'200'}>
                <InlineStack align={'space-between'} blockAlign={'center'}>
                  <InlineStack gap={'400'}>
                    {(!hasCharges || item.quantity > 1) && <Badge tone={'info'}>{item.quantity.toString()}</Badge>}
                    {hasCharges && <Badge tone={'magic'}>Has Additional Labour</Badge>}
                    {imageUrl && <Thumbnail alt={name} source={imageUrl} />}
                  </InlineStack>
                  <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                    {currencyFormatter(totalPrice)}
                  </Text>
                </InlineStack>
                <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'}>
                  {name}
                </Text>
                {itemLineItem?.order && (
                  <Box>
                    <Badge tone={'info'}>{itemLineItem.order.name}</Badge>
                  </Box>
                )}
                <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                  {itemLineItem?.sku}
                </Text>
              </BlockStack>
            </ResourceItem>
          );
        }}
      />

      {modalItem && (
        <WorkOrderItemModal
          createWorkOrder={createWorkOrder}
          itemUuid={modalItem.uuid}
          workOrder={workOrder}
          open={!!modalItem}
          onClose={() => setModalItem(null)}
          setToastAction={setToastAction}
          onSave={(item, charges) => {
            dispatch.updateItem({ item });
            dispatch.updateItemCharges({ item, charges });
          }}
        />
      )}

      {toast}
    </>
  );
}
