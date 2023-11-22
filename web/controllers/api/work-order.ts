import type { WorkOrderPaginationOptions } from '../../schemas/generated/work-order-pagination-options.js';
import type { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { getWorkOrder, upsertWorkOrder } from '../../services/work-order.js';
import { Session } from '@shopify/shopify-api';
import { db } from '../../services/db/db.js';
import {
  Authenticated,
  BodySchema,
  Get,
  Post,
  QuerySchema,
} from '@teifi-digital/shopify-app-express/decorators/default';

@Authenticated()
export default class WorkOrderController {
  @Post('/')
  @BodySchema('create-work-order')
  async createWorkOrder(req: any, res: any) {
    const session: Session = res.locals.shopify.session;
    const createWorkOrder: CreateWorkOrder = req.body;

    const workOrder = await upsertWorkOrder(session.shop, createWorkOrder);

    return res.json({ workOrder });
  }

  @Get('/')
  @QuerySchema('work-order-pagination-options')
  async fetchWorkOrderInfoPage(req: any, res: any) {
    const { shop }: Session = res.locals.shopify.session;
    const paginationOptions: WorkOrderPaginationOptions = req.query;

    if (paginationOptions.query) {
      paginationOptions.query = paginationOptions.query.replace(/%/g, '').replace(/_/g, '');
      paginationOptions.query = `%${paginationOptions.query}%`;
    }

    const infoPage = await db.workOrder.infoPage({
      shop,
      status: paginationOptions.status,
      offset: paginationOptions.offset,
      limit: paginationOptions.limit,
      query: paginationOptions.query,
    });

    return res.json({ infoPage });
  }

  @Get('/:name')
  async fetchWorkOrder(req: any, res: any) {
    const session: Session = res.locals.shopify.session;
    const { name } = req.params;

    const result = await getWorkOrder(session, name);

    if (!result) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    return res.json(result);
  }
}
