import { Controller } from '@teifi-digital/shopify-app-express/controllers';
import type { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { getWorkOrder, upsertWorkOrder, validateCreateWorkOrder } from '../../services/work-order.js';
import { Session } from '@shopify/shopify-api';
import { db } from '../../services/db/db.js';

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
  const { shop }: Session = res.locals.shopify.session;
  // TODO: use querySchemaName https://github.com/Teifi-Digital/shopify-app-express/pull/2
  const paginationOptions = {
    status: req.query.status,
    limit: Number.isNaN(parseInt(req.query.limit)) ? 25 : parseInt(req.query.limit),
    offset: Number.isNaN(parseInt(req.query.offset)) ? 0 : parseInt(req.query.offset),
  };

  const infoPage = await db.workOrder.infoPage({
    shop,
    status: paginationOptions.status,
    offset: paginationOptions.offset,
    limit: paginationOptions.limit,
  });

  return res.json({ infoPage });
}

async function fetchWorkOrder(req: any, res: any) {
  const session: Session = res.locals.shopify.session;
  const { name } = req.params;

  const result = await getWorkOrder(session.shop, name);

  if (!result) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  return res.json(result);
}

export default {
  endpoints: [
    ['/', 'POST', createWorkOrder, { jsonSchemaName: 'create-work-order' }],
    ['/', 'GET', fetchWorkOrderInfoPage],
    ['/:name', 'GET', fetchWorkOrder],
  ],
} satisfies Controller;
