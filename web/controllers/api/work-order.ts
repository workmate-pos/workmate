import { db } from '../../db.js';
import { Controller } from '@teifi-digital/shopify-app-express/controllers';
import type { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { validateCreateWorkOrder } from '../../services/work-orders.js';
import format from 'pg-format';
import { TableNames } from '../../services/postgres.js';
import { camelCaseObj } from '@teifi-digital/shopify-app-express/utils/string-utils.js';

async function createWorkOrder(req, res) {
  const session = res.locals.shopify.session;
  const createWorkOrder: CreateWorkOrder = req.body;

  console.log('got req', createWorkOrder);

  const settings = await db.findSettingsByShop(session.shop);
  const validationErrors = validateCreateWorkOrder(createWorkOrder, settings);

  if (validationErrors) {
    return res.status(400).json({ errors: validationErrors });
  }

  // TODO: create a sequence for every shop, and use it as {id}
  const id = settings.idFormat.replace('{id}', Math.round(Math.random() * 1000).toString());

  const workOrder = await db.upsert(
    'WorkOrders',
    {
      id: id,
      status: createWorkOrder.status,
      customerId: createWorkOrder.customer.id,
      depositAmount: Math.ceil(100 * createWorkOrder.price.deposit),
      taxAmount: Math.ceil(100 * createWorkOrder.price.tax),
      discountAmount: Math.ceil(100 * createWorkOrder.price.discount),
      dueDate: new Date(createWorkOrder.dueDate),
    },
    [],
    ['id'],
  );

  for (const item of createWorkOrder.items) {
    await db.store('WorkOrderItems', {
      workOrderId: workOrder.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: Math.ceil(100 * item.unitPrice),
    });
  }

  for (const assignment of createWorkOrder.employeeAssignments) {
    await db.store('WorkOrderAssignments', {
      workOrderId: workOrder.id,
      employeeId: assignment.employeeId,
    });
  }

  return res.json({ workOrder });
}

// TODO: pagination etc
async function fetchWorkOrders(req, res) {
  const workOrders = await db
    .getPool()
    .query(
      format(
        `
      SELECT wo.id, COUNT(woi.id) as item_count, COUNT(woa.id) as assignment_count
      FROM %I as wo
      LEFT JOIN %I as woi ON woi.work_order_id = wo.id
      LEFT JOIN %I as woa ON woa.work_order_id = wo.id
      GROUP BY wo.id
      `,
        TableNames.WorkOrders,
        TableNames.WorkOrderItems,
        TableNames.WorkOrderAssignments,
      ),
    )
    .then(({ rows }) => rows.map(camelCaseObj) as { id: string; itemCount: number; assignmentCount: number }[]);

  return res.json({ workOrders });
}

export default {
  endpoints: [
    ['/', 'POST', createWorkOrder, { jsonSchemaName: 'create-work-order' }],
    ['/', 'GET', fetchWorkOrders],
  ],
} satisfies Controller;
