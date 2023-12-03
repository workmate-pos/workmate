import type { WorkOrderPaginationOptions } from '../../schemas/generated/work-order-pagination-options.js';
import type { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import type { CreateWorkOrderRequest } from '../../schemas/generated/create-work-order-request.js';
import { getWorkOrder, upsertWorkOrder } from '../../services/work-order.js';
import { Session } from '@shopify/shopify-api';
import {
  Authenticated,
  BodySchema,
  Get,
  Post,
  QuerySchema,
} from '@teifi-digital/shopify-app-express/decorators/default';
import { Request, Response } from 'express-serve-static-core';
import { db } from '../../services/db/db.js';
import { getSettingsByShop } from '../../services/settings.js';

@Authenticated()
export default class WorkOrderController {
  @Post('/')
  @BodySchema('create-work-order')
  async createWorkOrder(req: Request<unknown, unknown, CreateWorkOrder>, res: Response<CreateWorkOrderResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const createWorkOrder = req.body;

    const { name } = await upsertWorkOrder(shop, createWorkOrder);

    return res.json({ workOrder: { name } });
  }

  @Post('/request')
  @BodySchema('create-work-order-request')
  async createWorkOrderRequest(
    req: Request<unknown, unknown, CreateWorkOrderRequest>,
    res: Response<CreateWorkOrderRequestResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const createWorkOrderRequest = req.body;

    const settings = await getSettingsByShop(shop);

    if (!settings.workOrderRequests.enabled) {
      return res.status(403).json({ error: 'Work order requests are disabled' });
    }

    if (!settings.workOrderRequests.statuses.includes(createWorkOrderRequest.status)) {
      return res.status(403).json({ error: 'Invalid status' });
    }

    const { name } = await upsertWorkOrder(shop, {
      ...createWorkOrderRequest,
      price: { tax: 0, shipping: 0, discount: 0 },
      products: [],
      employeeAssignments: [],
    });

    return res.json({ workOrder: { name } });
  }

  @Get('/')
  @QuerySchema('work-order-pagination-options')
  async fetchWorkOrderInfoPage(
    req: Request<unknown, unknown, unknown, WorkOrderPaginationOptions>,
    res: Response<FetchWorkOrderInfoPageResponse>,
  ) {
    const { shop }: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

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
  async fetchWorkOrder(req: Request<{ name: string }>, res: Response) {
    const session: Session = res.locals.shopify.session;
    const { name } = req.params;

    const result = await getWorkOrder(session, name);

    if (!result) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    return res.json(result);
  }
}

export type CreateWorkOrderResponse = {
  workOrder: { name: string };
};

export type CreateWorkOrderRequestResponse =
  | {
      workOrder: { name: string };
    }
  | {
      error: string;
    };

export type FetchWorkOrderInfoPageResponse = {
  infoPage: Awaited<ReturnType<typeof db.workOrder.infoPage>>;
};

export type FetchWorkOrderResponse = NonNullable<Awaited<ReturnType<typeof getWorkOrder>>>;
