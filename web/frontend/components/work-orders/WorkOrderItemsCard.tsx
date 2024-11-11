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
import { CreateWorkOrder, Int } from '@web/schemas/generated/create-work-order.js';
import { Dispatch, SetStateAction, useState } from 'react';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { hasNonNullableProperty, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { WorkOrderItemModal } from '@web/frontend/components/work-orders/modals/WorkOrderItemModal.js';
import { DetailedWorkOrder } from '@web/services/work-orders/types.js';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { AddProductModal } from '@web/frontend/components/shared-orders/modals/AddProductModal.js';
import { groupBy } from '@teifi-digital/shopify-app-toolbox/array';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';
import { ProductVariantSelectorModal } from '@web/frontend/components/selectors/ProductVariantSelectorModal.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { ProductVariantSerialSelectorModal } from '@web/frontend/components/selectors/ProductVariantSerialSelectorModal.js';
import { uuid } from '@work-orders/common/util/uuid.js';

export function WorkOrderItemsCard({
  createWorkOrder,
  workOrder,
  dispatch,
  disabled,
  isLoading,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  workOrder: DetailedWorkOrder | null;
  dispatch: CreateWorkOrderDispatchProxy;
  disabled: boolean;
  isLoading: boolean;
}) {
  const [toast, setToastAction] = useToast();
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddSerialModalOpen, setIsAddSerialModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [serialProductVariantId, setSerialProductVariantId] = useState<ID>();
  const [editItem, setEditItem] = useState<CreateWorkOrder['items'][number] | null>(null);

  return (
    <Card>
      <BlockStack gap={'400'}>
        <InlineStack align={'space-between'}>
          <Text as={'h2'} variant={'headingMd'} fontWeight={'bold'}>
            Items
          </Text>
          <Box>{isLoading && <Spinner size={'small'} />}</Box>
        </InlineStack>
        <ProductsList
          createWorkOrder={createWorkOrder}
          dispatch={dispatch}
          workOrder={workOrder}
          disabled={disabled}
          editItem={editItem}
          setEditItem={setEditItem}
        />
        <ButtonGroup fullWidth>
          <Button onClick={() => setIsAddProductModalOpen(true)} disabled={disabled}>
            Add product
          </Button>
          <Button onClick={() => setIsAddSerialModalOpen(true)} disabled={disabled}>
            Add serial
          </Button>
          <Button onClick={() => setIsAddServiceModalOpen(true)} disabled={disabled}>
            Add service
          </Button>
        </ButtonGroup>
      </BlockStack>

      {isAddProductModalOpen && (
        <AddProductModal
          outputType="WORK_ORDER"
          companyLocationId={createWorkOrder.companyLocationId}
          productType="PRODUCT"
          open={isAddProductModalOpen}
          setToastAction={setToastAction}
          onClose={() => setIsAddProductModalOpen(false)}
          onAdd={(items, charges) => {
            const chargesByItem = groupBy(
              charges.filter(hasNonNullableProperty('workOrderItemUuid')),
              charge => charge.workOrderItemUuid,
            );

            for (const charges of Object.values(chargesByItem)) {
              const [charge = never()] = charges;
              dispatch.updateItemCharges({ item: { uuid: charge.workOrderItemUuid }, charges });
            }

            dispatch.addItems({ items });

            const customItem = items.find(hasPropertyValue('type', 'custom-item'));

            if (customItem) {
              setEditItem(customItem);
            }
          }}
        />
      )}

      <ProductVariantSelectorModal
        onSelect={productVariant => setSerialProductVariantId(productVariant.id)}
        open={isAddSerialModalOpen}
        filters={{ type: 'serial', status: ['active'] }}
        onClose={() => setIsAddSerialModalOpen(false)}
      />

      <ProductVariantSerialSelectorModal
        onSelect={(serial, productVariantId) => {
          // TODO: Also add default charges
          dispatch.addItems({
            items: [
              {
                type: 'product',
                uuid: uuid(),
                quantity: 1,
                serial: { serial, productVariantId },
                absorbCharges: false,
                // TODO: Default charges
                customFields: {},
                productVariantId,
              },
            ],
          });
          setSerialProductVariantId(undefined);
        }}
        open={!!serialProductVariantId}
        filters={{
          sold: false,
          locationId: workOrder?.locationId ?? undefined,
          productVariantId: serialProductVariantId,
        }}
        onClose={() => setSerialProductVariantId(undefined)}
      />

      <AddProductModal
        outputType="WORK_ORDER"
        productType="SERVICE"
        open={isAddServiceModalOpen}
        setToastAction={setToastAction}
        onClose={() => setIsAddServiceModalOpen(false)}
        onAdd={(items, charges) => {
          const chargesByItem = groupBy(
            charges.filter(hasNonNullableProperty('workOrderItemUuid')),
            charge => charge.workOrderItemUuid,
          );

          for (const charges of Object.values(chargesByItem)) {
            const [charge = never()] = charges;
            dispatch.updateItemCharges({ item: { uuid: charge.workOrderItemUuid }, charges });
          }

          dispatch.addItems({ items });

          const [item] = items;
          if (item) {
            setIsAddServiceModalOpen(false);
            setEditItem(item);
          }
        }}
      />

      {toast}
    </Card>
  );
}

function ProductsList({
  createWorkOrder,
  workOrder,
  dispatch,
  disabled,
  editItem,
  setEditItem,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  workOrder: DetailedWorkOrder | null;
  dispatch: CreateWorkOrderDispatchProxy;
  disabled: boolean;
  editItem: CreateWorkOrder['items'][number] | null;
  setEditItem: Dispatch<SetStateAction<CreateWorkOrder['items'][number] | null>>;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const productVariantQueries = useProductVariantQueries({
    fetch,
    ids: createWorkOrder.items.filter(hasPropertyValue('type', 'product')).map(item => item.productVariantId),
  });
  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery({ fetch, ...createWorkOrder });

  const onItemClick = (item: CreateWorkOrder['items'][number]) => {
    if (disabled) return;
    setEditItem(item);
  };

  const onItemRemove = (item: CreateWorkOrder['items'][number]) => {
    dispatch.updateItem({ item: { ...item, quantity: 0 as Int } });
  };

  return (
    <>
      <ResourceList
        items={createWorkOrder.items}
        resourceName={{ singular: 'product', plural: 'products' }}
        resolveItemId={item => item.uuid}
        renderItem={item => {
          const itemLineItem = calculatedDraftOrderQuery.getItemLineItem(item);
          const productVariant =
            itemLineItem?.variant ??
            (item.type === 'product' ? productVariantQueries[item.productVariantId]?.data : null);

          const canRemove = !!itemLineItem?.order;

          const name =
            itemLineItem?.name ??
            getProductVariantName(productVariant) ??
            (calculatedDraftOrderQuery.isFetching ? 'Loading...' : 'Unknown item');
          const sku = itemLineItem?.sku ?? productVariant?.sku;
          const imageUrl =
            itemLineItem?.image?.url ?? productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;

          const charges = createWorkOrder.charges.filter(hasPropertyValue('workOrderItemUuid', item.uuid));

          const fallbackItemPrice =
            !createWorkOrder.companyId && productVariant?.price
              ? BigDecimal.fromMoney(productVariant.price)
                  .multiply(BigDecimal.fromString(item.quantity.toString()))
                  .toMoney()
              : undefined;

          const itemPrice = calculatedDraftOrderQuery.getItemPrice(item) ?? fallbackItemPrice;
          const chargePrices = calculatedDraftOrderQuery
            ? charges.map(charge => calculatedDraftOrderQuery.getChargePrice(charge))
            : createWorkOrder.companyId
              ? []
              : [getTotalPriceForCharges(charges)];

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
                    {item.serial && <Badge tone={'info-strong'}>{item.serial.serial}</Badge>}
                    {!item.serial && (!hasCharges || item.quantity > 1) && (
                      <Badge tone={'info'}>{item.quantity.toString()}</Badge>
                    )}
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
                  {sku}
                </Text>
              </BlockStack>
            </ResourceItem>
          );
        }}
      />

      {editItem && (
        <WorkOrderItemModal
          createWorkOrder={createWorkOrder}
          item={editItem}
          workOrder={workOrder}
          open={!!editItem}
          onClose={() => setEditItem(null)}
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
