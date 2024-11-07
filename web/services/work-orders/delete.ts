import { Session } from '@shopify/shopify-api';
import { getDetailedWorkOrder } from './get.js';
import { getWorkOrder } from './queries.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { LocalsTeifiUser } from '../../decorators/permission.js';
import { unit } from '../db/unit-of-work.js';
import * as queries from './queries.js';
import { deleteTaskWorkOrderLinks } from '../tasks/queries.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';

// TODO: Show individual delete button in purchase order/work order too OR reason for not being able to delete
// TODO: On delete, show an overview of all things related to this work order (eg all special orders) with an option to delete them too
// TODO: For bulk, show errors in the modal
// TODO: Delete reservations

export async function deleteWorkOrder(session: Session, user: LocalsTeifiUser, name: string) {
  await unit(async () => {
    const [workOrder, workOrderId] = await Promise.all([
      getDetailedWorkOrder(session, name, user.user.allowedLocationIds),
      getWorkOrder({ shop: session.shop, name, locationIds: user.user.allowedLocationIds }).then(wo => wo?.id),
    ]);

    if (!workOrder || workOrderId === undefined) {
      throw new HttpError('Work order not found', 404);
    }

    if (workOrder.orders.some(order => order.type === 'ORDER')) {
      throw new HttpError('Cannot delete work order that has has been (partially) paid', 400);
    }

    if (workOrder.orders.length) {
      const graphql = new Graphql(session);
      await gql.draftOrder.removeMany.run(graphql, { ids: workOrder.orders.map(order => order.id) });
    }

    await Promise.all([
      queries.deleteWorkOrderCustomFields(workOrderId),

      Promise.all([
        queries.deleteWorkOrderItemCustomFields(workOrderId),
        queries.deleteWorkOrderCharges(workOrderId),
      ]).then(() => queries.deleteWorkOrderItems(workOrderId)),

      deleteTaskWorkOrderLinks({ workOrderId }),
    ]);

    await queries.deleteWorkOrder({ workOrderId });
  });
}
