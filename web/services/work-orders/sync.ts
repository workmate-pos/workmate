import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { gql } from '../gql/gql.js';
import { assertGid, isGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import {
  getCustomAttributeArrayFromObject,
  getWorkOrderOrderCustomAttributes,
} from '@work-orders/work-order-shopify-order';
import { hasNestedPropertyValue, hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { syncShopifyOrders } from '../shopify-order/sync.js';
import { assertGidOrNull } from '../../util/assertions.js';
import { getDraftOrderInputForExistingWorkOrder } from './draft-order.js';
import { getWorkOrder, getWorkOrderCharges, getWorkOrderCustomFields, getWorkOrderItems } from './queries.js';

export type SyncWorkOrdersOptions = {
  /**
   * If true, work orders are only synced if there is some unlinked line item.
   * Defaults to false.
   *
   * This is used to break an infinite update cycle:
   * 1. Update Order webhook
   * 2. Sync Related Work Orders (in case something was deleted)
   * 3. Update Order webhook
   */
  onlySyncIfUnlinked?: boolean;

  /**
   * If true, updates the custom attributes of existing orders.
   * Defaults to true.
   */
  updateCustomAttributes?: boolean;
};

const defaultSyncWorkOrdersOptions = {
  onlySyncIfUnlinked: false,
  updateCustomAttributes: true,
} as const satisfies SyncWorkOrdersOptions;

export async function syncWorkOrders(session: Session, workOrderIds: number[], options?: SyncWorkOrdersOptions) {
  if (workOrderIds.length === 0) {
    return;
  }

  const errors: unknown[] = [];

  for (const workOrderId of workOrderIds) {
    await syncWorkOrder(session, workOrderId, options).catch(error => errors.push(error));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync work orders');
  }
}

/**
 * Syncs a work order to Shopify by creating a new draft order for any draft/unlinked line items, and updating custom attributes of existing orders.
 */
export async function syncWorkOrder(session: Session, workOrderId: number, options?: SyncWorkOrdersOptions) {
  const [workOrder, customFields, items, charges] = await Promise.all([
    getWorkOrder({ id: workOrderId }),
    getWorkOrderCustomFields(workOrderId),
    getWorkOrderItems(workOrderId),
    getWorkOrderCharges(workOrderId),
  ]);

  if (!workOrder) {
    throw new Error(`Work order with id ${workOrderId} not found`);
  }

  const onlySyncIfUnlinked = options?.onlySyncIfUnlinked ?? defaultSyncWorkOrdersOptions.onlySyncIfUnlinked;
  const hasUnlinked = [...items, ...charges].some(hasPropertyValue('shopifyOrderLineItemId', null));
  const shouldSync = !onlySyncIfUnlinked || hasUnlinked;

  const input = await getDraftOrderInputForExistingWorkOrder(session, workOrder.name);

  const graphql = new Graphql(session);
  const linkedOrders = await db.shopifyOrder.getLinkedOrdersByWorkOrderId({ workOrderId });

  if (shouldSync) {
    const linkedDraftOrders = await gql.draftOrder.getManyForDatabase
      .run(graphql, {
        ids: linkedOrders
          .filter(hasPropertyValue('orderType', 'DRAFT_ORDER'))
          .map(order => order.orderId)
          .filter(isGid),
      })
      .then(orders => orders.nodes.filter(hasNestedPropertyValue('__typename', 'DraftOrder')));

    const draftOrdersToDelete = linkedDraftOrders.map(order => order.id);

    if (!!input.lineItems?.length) {
      const updateDraftOrder = linkedDraftOrders[0];
      const updateDraftOrderId = updateDraftOrder?.id ?? null;
      assertGidOrNull(updateDraftOrderId);

      if (updateDraftOrderId) {
        draftOrdersToDelete.splice(draftOrdersToDelete.indexOf(updateDraftOrderId), 1);
      }

      const { result } = updateDraftOrderId
        ? await gql.draftOrder.update.run(graphql, { id: updateDraftOrderId, input })
        : await gql.draftOrder.create.run(graphql, { input });

      if (!result?.draftOrder) {
        throw new Error('Failed to create/update draft order');
      }

      await syncShopifyOrders(session, [result.draftOrder.id]);
    }

    if (draftOrdersToDelete.length > 0) {
      await gql.draftOrder.removeMany.run(graphql, { ids: draftOrdersToDelete });
    }
  }

  if (options?.updateCustomAttributes ?? defaultSyncWorkOrdersOptions.updateCustomAttributes) {
    await Promise.all(
      linkedOrders.filter(hasPropertyValue('orderType', 'ORDER')).map(order => {
        assertGid(order.orderId);

        return gql.order.updateCustomAttributes.run(graphql, {
          id: order.orderId,
          customAttributes: getCustomAttributeArrayFromObject(
            getWorkOrderOrderCustomAttributes({
              name: workOrder.name,
              customFields: Object.fromEntries(customFields.map(({ key, value }) => [key, value])),
            }),
          ),
        });
      }),
    );
  }
}
