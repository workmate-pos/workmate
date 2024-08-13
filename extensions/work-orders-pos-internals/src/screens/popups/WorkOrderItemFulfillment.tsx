import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useWorkOrderQuery } from '@work-orders/common/queries/use-work-order-query.js';
import { DetailedWorkOrder } from '@web/services/work-orders/types.js';
import {
  BadgeProps,
  Button,
  List,
  ListRow,
  ScrollView,
  Selectable,
  Text,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { match } from 'ts-pattern';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { sum, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { getPurchaseOrderBadge, getTransferOrderBadge } from '../../util/badges.js';
import { useRouter } from '../../routes.js';
import { Dispatch, SetStateAction, useState } from 'react';

/**
 * An action related to fulfillment.
 */
export type PlanItem = PlanItemBase &
  (
    | {
        type: 'PO' | 'TO';
        /**
         * Optional name of a purchase order to add this item to.
         * If not provided, a new purchase order will be created.
         */
        name?: string;
        quantity: number;
      }
    | {
        /**
         * Create a shopify order for this item.
         * Quantity is currently not supported.
         */
        type: 'SO';
      }
  );

type PlanItemBase = {
  uuid: string;
};

/**
 * Fulfillment options for some work order.
 * Allows you to create purchase orders, transfer orders, and shopify orders for some work order line items.
 *
 * Purchase orders are used to backorder inventory.
 * Transfer orders are used to transfer inventory from one location to the other.
 * Shopify orders can be created to commit in-stock inventory.
 */
export function WorkOrderItemFulfillment({ name }: { name: string }) {
  const [plan, setPlan] = useState<PlanItem[]>([]);

  const fetch = useAuthenticatedFetch();

  const workOrderQuery = useWorkOrderQuery({ fetch, name });
  const workOrder = workOrderQuery.data?.workOrder;
  const rows = useItemListRows(workOrder ?? null, plan, setPlan);

  const router = useRouter();
  const screen = useScreen();
  screen.setTitle(`${name} Fulfillment`);

  if (workOrderQuery.isError) {
    return (
      <ScrollView>
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text color="TextCritical" variant="body">
            {extractErrorMessage(workOrderQuery.error, 'An error occurred while loading work order')}
          </Text>
        </ResponsiveStack>
      </ScrollView>
    );
  }

  if (!workOrder) {
    return null;
  }

  // TODO: Different name from fulfillment since thats already a shopify thing and is not the same
  return (
    <ScrollView>
      <ResponsiveStack direction={'vertical'} paddingVertical={'Medium'} spacing={1}>
        <ResponsiveStack direction={'horizontal'} spacing={2} alignment={'space-between'} flexWrap={'wrap'}>
          <Text variant={'headingLarge'}>Work Order Fulfillment</Text>
          <Selectable onPress={() => router.push('WorkOrderItemFulfillmentHelp', {})}>
            <Text variant={'bodyMd'} color={'TextInteractive'}>
              Help
            </Text>
          </Selectable>
        </ResponsiveStack>
        <Text variant={'bodyMd'} color={'TextSubdued'}>
          Control line item inventory sourcing by creating purchase orders, transfer orders, and by committing inventory
          to this work order.
        </Text>
      </ResponsiveStack>

      <List data={rows} onEndReached={() => {}} isLoadingMore={false} />
      {rows.length === 0 && (
        <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
          <Text variant="body" color="TextSubdued">
            No items found
          </Text>
        </ResponsiveStack>
      )}

      {/*TODO:Highlight the plan here*/}

      <ResponsiveStack direction={'vertical'} spacing={2} paddingVertical={'Medium'}>
        {plan.map(item => (
          <Text>xd</Text>
        ))}
      </ResponsiveStack>

      <Button title={''} />
    </ScrollView>
  );
}

function useItemListRows(
  workOrder: DetailedWorkOrder | null,
  plan: PlanItem[],
  setPlan: Dispatch<SetStateAction<PlanItem[]>>,
): ListRow[] {
  const { toast } = useExtensionApi<'pos.home.modal.render'>();
  const router = useRouter();

  const fetch = useAuthenticatedFetch();
  const productVariantIds = unique(
    workOrder?.items.filter(hasPropertyValue('type', 'product')).map(item => item.productVariantId) ?? [],
  );
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  if (!workOrder) {
    return [];
  }

  return workOrder.items.map<ListRow>(item => {
    const canEdit = true;

    const purchaseOrders = item.type !== 'product' ? [] : item.purchaseOrders;
    const transferOrders = item.type !== 'product' ? [] : item.transferOrders;
    const shopifyOrderId = item.shopifyOrderLineItem?.orderId;
    const shopifyOrder = !shopifyOrderId ? undefined : workOrder.orders.find(hasPropertyValue('id', shopifyOrderId));

    // General status that shows whether the line item has committed inventory, is waiting for a PO/TO, or still required sourcing.
    const statusBadge: BadgeProps = (() => {
      if (shopifyOrder) {
        // If the item has a shopify order we are done as it will have been committed or fulfilled
        return {
          text: 'Sourced',
          status: 'complete',
          variant: 'success',
        };
      }

      const poQuantity = sum(purchaseOrders.flatMap(po => po.items.map(item => item.quantity)));
      const poAvailableQuantity = sum(purchaseOrders.flatMap(po => po.items.map(item => item.availableQuantity)));

      if (poAvailableQuantity < poQuantity) {
        // Not all PO items have been sourced
        return {
          text: 'Pending inventory',
          status: poAvailableQuantity === 0 ? 'empty' : 'partial',
          variant: 'warning',
        };
      }

      const incomingTransferOrderItemCount = sum(
        transferOrders.flatMap(to =>
          to.items.filter(item => item.status === 'PENDING' || item.status === 'IN_TRANSIT').map(item => item.quantity),
        ),
      );
      const transferOrderItemCount = sum(transferOrders.flatMap(to => to.items.map(item => item.quantity)));

      if (incomingTransferOrderItemCount > 0) {
        return {
          text: 'Pending inventory',
          status: incomingTransferOrderItemCount < transferOrderItemCount ? 'partial' : 'empty',
          variant: 'warning',
        };
      }

      // No source for this line item yet, so you must create a SO/TO/PO
      return {
        text: 'Requires sourcing',
        status: 'empty',
        variant: 'critical',
      };
    })();

    return {
      id: item.uuid,
      onPress: () => {
        if (!canEdit) {
          toast.show('This line item cannot be edited');
          return;
        }

        router.push('WorkOrderItemFulfillmentItem', {
          item,
          plan,
          onSave: itemPlan =>
            setPlan(current => [...current.filter(planItem => planItem.uuid !== item.uuid), ...itemPlan]),
        });
      },
      leftSide: {
        label: match(item)
          .with({ type: 'product' }, item => {
            const productVariantQuery = productVariantQueries[item.productVariantId];

            if (!productVariantQuery) {
              return 'N/A';
            }

            if (productVariantQuery.isLoading) {
              return 'Loading...';
            }

            if (productVariantQuery.isError) {
              return 'Error loading product';
            }

            const productVariant = productVariantQuery.data;
            return getProductVariantName(productVariant) ?? 'Unknown product';
          })
          .with({ type: 'custom-item' }, item => item.name)
          .exhaustive(),
        badges: [
          statusBadge,
          ...[shopifyOrder]
            .filter(isNonNullable)
            .filter(hasPropertyValue('type', 'ORDER'))
            .map<BadgeProps>(so => ({ text: so.name, variant: 'highlight' })),
          ...purchaseOrders.map<BadgeProps>(po => getPurchaseOrderBadge(po, true)),
          ...transferOrders.map<BadgeProps>(to => getTransferOrderBadge(to, true)),
        ],
      },
      rightSide: {
        showChevron: canEdit,
      },
    };
  });
}
