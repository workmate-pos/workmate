import { Session } from '@shopify/shopify-api';
import { db } from '../db/db.js';
import { ID } from '../gql/queries/generated/schema.js';
import { getFormattedId } from '../id-formatting.js';
import { getShopSettings } from '../settings.js';
import { unit } from '../db/unit-of-work.js';
import { createWorkOrderCharges, removeWorkOrderCharges } from './charges.js';
import { getOrderOptions, updateOrder, upsertDraftOrder } from './order.js';
import { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

export async function upsertWorkOrder(session: Session, createWorkOrder: CreateWorkOrder) {
  return await unit(async () => {
    const settings = await getShopSettings(session.shop);

    if (!settings.statuses.includes(createWorkOrder.status)) {
      throw new HttpError(`Invalid status, must be in ${JSON.stringify(settings.statuses)}`, 400);
    }

    const isNew = createWorkOrder.name === null;
    const [currentWorkOrder] = isNew ? [] : await db.workOrder.get({ shop: session.shop, name: createWorkOrder.name });

    if (!isNew && !currentWorkOrder) {
      throw new HttpError('Work order not found', 404);
    }

    const [{ id, name: workOrderName } = never()] = await db.workOrder.upsert({
      shop: session.shop,
      name: createWorkOrder.name ?? (await getFormattedId(session.shop)),
      status: createWorkOrder.status,
      customerId: createWorkOrder.customerId,
      dueDate: new Date(createWorkOrder.dueDate),
      derivedFromOrderId: createWorkOrder.derivedFromOrderId,
      orderId: currentWorkOrder?.orderId ?? null,
      draftOrderId: currentWorkOrder?.draftOrderId ?? null,
    });

    let draftOrderId: ID | null = null;
    let orderId: ID | null = null;

    const orderIdSet = !!currentWorkOrder?.orderId;

    const action = orderIdSet ? 'updateOrder' : 'upsertDraftOrder';

    const options = await getOrderOptions(session.shop);

    if (action === 'upsertDraftOrder') {
      await removeWorkOrderCharges(id);
      await createWorkOrderCharges(id, createWorkOrder);
    }

    switch (action) {
      case 'upsertDraftOrder': {
        const draftOrder = await upsertDraftOrder(
          session,
          workOrderName,
          createWorkOrder,
          options,
          (currentWorkOrder?.draftOrderId ?? undefined) as ID | undefined,
        );
        draftOrderId = draftOrder.id;
        break;
      }

      case 'updateOrder': {
        const order = await updateOrder(
          session,
          workOrderName,
          createWorkOrder,
          options,
          (currentWorkOrder?.orderId ?? never()) as ID,
        );
        orderId = order.id;
        break;
      }

      default:
        return action satisfies never;
    }

    await db.workOrder.updateOrderIds({
      id,
      orderId,
      draftOrderId,
    });

    return { name: workOrderName };
  });
}
