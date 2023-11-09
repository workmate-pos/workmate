import { Controller } from '@teifi-digital/shopify-app-express/controllers';
import type { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import type { WorkOrderPaginationOptions } from '../../schemas/generated/work-order-pagination-options.js';
import {
  getPaginatedWorkOrders,
  getWorkOrder,
  upsertWorkOrder,
  validateCreateWorkOrder,
} from '../../services/work-order.js';
import { Session } from '@shopify/shopify-api';

async function createWorkOrder(req: any, res: any) {
  const session: Session = res.locals.shopify.session;
  const createWorkOrder: CreateWorkOrder = req.body;

  const validationResult = await validateCreateWorkOrder(session.shop, createWorkOrder);

  if (validationResult.type === 'error') {
    return res.status(400).json({ errors: validationResult.errors });
  }

  await upsertWorkOrder(session.shop, validationResult.validated);

  return res.json({ success: true });
}

async function fetchWorkOrderInfoPage(req: any, res: any) {
  const session: Session = res.locals.shopify.session;
  const paginationOptions: WorkOrderPaginationOptions = req.query;

  const workOrders = await getPaginatedWorkOrders(session.shop, paginationOptions);

  return res.json({ workOrders });
}

async function fetchWorkOrder(req: any, res: any) {
  const session: Session = res.locals.shopify.session;
  const { name } = req.params;

  const workOrder = await getWorkOrder(session.shop, name);

  if (!workOrder) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  return res.json({ workOrder });
}

export default {
  endpoints: [
    ['/', 'POST', createWorkOrder, { bodySchemaName: 'create-work-order' }],
    ['/', 'GET', fetchWorkOrderInfoPage, { querySchemaName: 'work-order-pagination-options' }],
    ['/:name', 'GET', fetchWorkOrder],
  ],
} satisfies Controller;
