import { Session } from '@shopify/shopify-api';
import { CreateWorkOrderOrder } from '../../schemas/generated/create-work-order-order.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { getDraftOrderInputForExistingWorkOrder } from './draft-order.js';
import { GraphqlUserErrors, HttpError } from '@teifi-digital/shopify-app-express/errors';
import { gql } from '../gql/gql.js';
import { getWorkOrder } from './queries.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';

/**
 * Creates an order for the given work order items.
 * Used to create order without payment.
 *
 * 1) Create draft order
 * 2) Mark draft order as completed (creates real order)
 * 3) Webhook will removed order items from the WO's actual draft order
 */
export async function createWorkOrderOrder(
  session: Session,
  createWorkOrderOrder: CreateWorkOrderOrder,
  user: LocalsTeifiUser,
) {
  const graphql = new Graphql(session);

  const workOrder = await getWorkOrder({
    shop: session.shop,
    name: createWorkOrderOrder.name,
    locationIds: user.user.allowedLocationIds,
  });

  if (!workOrder) {
    throw new HttpError('Work order not found', 404);
  }

  if (!workOrder.companyId) {
    throw new HttpError('Only b2b work orders can be converted to an order');
  }

  const input = await getDraftOrderInputForExistingWorkOrder(session, createWorkOrderOrder.name, {
    selectedItems: createWorkOrderOrder.items,
    selectedCharges: createWorkOrderOrder.charges,
  });

  if (!input) {
    throw new HttpError('Could not create order', 500);
  }

  try {
    const response = await gql.draftOrder.create.run(graphql, { input });

    if (!response.result?.draftOrder) {
      throw new HttpError('Failed to create order', 500);
    }

    const { draftOrderComplete } = await gql.draftOrder.complete.run(graphql, {
      id: response.result.draftOrder.id,
      paymentPending: true,
    });

    if (!draftOrderComplete?.draftOrder?.order) {
      throw new HttpError('Failed to complete order', 500);
    }

    return { order: draftOrderComplete.draftOrder.order, workOrder: { id: workOrder.id } };
  } catch (error) {
    if (error instanceof GraphqlUserErrors) {
      const message = error.userErrors.map(error => error.message).join(', ');
      throw new HttpError(message, 400);
    }

    throw error;
  }
}
