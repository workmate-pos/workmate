import { Session } from '@shopify/shopify-api';
import { getDetailedWorkOrder } from './get.js';
import { getWorkOrder } from './queries.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { LocalsTeifiUser } from '../../decorators/permission.js';
import { unit } from '../db/unit-of-work.js';
import * as queries from './queries.js';
import { deleteTaskWorkOrderLinks } from '../tasks/queries.js';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { zip } from '@teifi-digital/shopify-app-toolbox/iteration';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

// TODO: Show individual delete button in purchase order/work order too OR reason for not being able to delete
// TODO: On delete, show an overview of all things related to this work order (eg all special orders) with an option to delete them too
// TODO: For bulk, show errors in the modal
// TODO: Delete reservations

export async function deleteWorkOrders(session: Session, user: LocalsTeifiUser, names: string[]) {
  if (!names.length) {
    return [];
  }

  return await unit(async () => {
    const { workOrders, ids } = await awaitNested({
      workOrders: names.map(name => getDetailedWorkOrder(session, name, user.user.allowedLocationIds)),
      ids: names.map(name =>
        getWorkOrder({ shop: session.shop, name, locationIds: user.user.allowedLocationIds }).then(wo => wo?.id),
      ),
    });

    const errors: [name: string, error: HttpError][] = [];
    const workOrderIds: number[] = [];
    const draftOrderIds: ID[] = [];

    for (const [[workOrder, workOrderId], name] of zip(zip(workOrders, ids), names)) {
      if (!workOrder || workOrderId === undefined) {
        errors.push([name, new HttpError(`Work order ${name} not found`, 404)]);
        continue;
      }

      if (workOrder.orders.some(order => order.type === 'ORDER')) {
        errors.push([name, new HttpError(`Cannot delete ${name}, as it has been (partially) paid`, 400)]);
        continue;
      }

      workOrderIds.push(workOrderId);
      draftOrderIds.push(...workOrder.orders.map(order => order.id));
    }

    const graphql = new Graphql(session);

    await Promise.all([
      Promise.all([
        queries.deleteWorkOrderItemCustomFields({ workOrderIds }),
        queries.deleteWorkOrderCharges({ workOrderIds }),
      ]).then(() => queries.deleteWorkOrderItems({ workOrderIds })),

      queries.deleteWorkOrderCustomFields({ workOrderIds }),
      deleteTaskWorkOrderLinks({ workOrderIds }),

      draftOrderIds.length &&
        gql.draftOrder.removeMany.run(graphql, { ids: draftOrderIds }).catch(error => sentryErr(error)),
    ]);

    await queries.deleteWorkOrders({ workOrderIds });

    return errors;
  });
}
