import { Session } from '@shopify/shopify-api';
import {
  Authenticated,
  BodySchema,
  Get,
  Post,
  QuerySchema,
} from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { Request, Response } from 'express-serve-static-core';
import type { WorkOrderPaginationOptions } from '../../schemas/generated/work-order-pagination-options.js';
import type { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import type { CreateWorkOrderRequest } from '../../schemas/generated/create-work-order-request.js';
import { getWorkOrder, getWorkOrderInfoPage } from '../../services/work-orders/get.js';
import { getShopSettings } from '../../services/settings.js';
import { upsertWorkOrder } from '../../services/work-orders/upsert.js';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { ID } from '../../schemas/generated/ids.js';
import { sessionStorage } from '../../index.js';
import { calculateDraftOrder } from '../../services/work-orders/calculate.js';

export default class WorkOrderController {
  @Post('/calculate-draft-order')
  @BodySchema('calculate-work-order')
  @Authenticated()
  async getDraftDetails(
    req: Request<unknown, unknown, CalculateWorkOrder>,
    res: Response<CalculateDraftOrderResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const calculateWorkOrder = req.body;

    const calculatedDraft = await calculateDraftOrder(session, calculateWorkOrder);

    return res.json(calculatedDraft);
  }

  @Post('/')
  @BodySchema('create-work-order')
  @Authenticated()
  async createWorkOrder(req: Request<unknown, unknown, CreateWorkOrder>, res: Response<CreateWorkOrderResponse>) {
    const session: Session = res.locals.shopify.session;
    const createWorkOrder = req.body;

    const { name } = await upsertWorkOrder(session, createWorkOrder);

    return res.json({ name });
  }

  @Post('/request')
  @BodySchema('create-work-order-request')
  async createWorkOrderRequest(
    req: Request<unknown, unknown, CreateWorkOrderRequest>,
    res: Response<CreateWorkOrderRequestResponse | { error: string }>,
  ) {
    const createWorkOrderRequest = req.body;

    // provided by app proxy (https://shopify.dev/docs/apps/online-store/app-proxies)
    const { logged_in_customer_id: customerId, shop } = req.query;

    if (typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    if (typeof shop !== 'string') {
      return res.status(400).json({ error: 'Shop is required' });
    }

    const settings = await getShopSettings(shop);

    if (!settings.workOrderRequests.enabled) {
      return res.status(403).json({ error: 'Work order requests are disabled' });
    }

    const session = await sessionStorage.fetchOfflineSessionByShop(shop);

    if (!session) {
      return res.status(400).json({ error: 'Shop is not installed' });
    }

    const { name } = await upsertWorkOrder(session, {
      status: settings.workOrderRequests.status,
      dueDate: createWorkOrderRequest.dueDate,
      customerId: `gid://shopify/Customer/${customerId}` as ID,
      description: createWorkOrderRequest.description,
      charges: [],
      lineItems: [],
      derivedFromOrderId: null,
      name: null,
      discount: null,
    });

    return res.json({ name });
  }

  @Get('/')
  @QuerySchema('work-order-pagination-options')
  @Authenticated()
  async fetchWorkOrderInfoPage(
    req: Request<unknown, unknown, unknown, WorkOrderPaginationOptions>,
    res: Response<FetchWorkOrderInfoPageResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const workOrders = await getWorkOrderInfoPage(session, paginationOptions);

    return res.json(workOrders);
  }

  @Get('/:name')
  @Authenticated()
  async fetchWorkOrder(req: Request<{ name: string }>, res: Response<FetchWorkOrderResponse | { error: string }>) {
    const session: Session = res.locals.shopify.session;
    const { name } = req.params;

    const result = await getWorkOrder(session, name);

    if (!result) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    return res.json(result);
  }
}

export type CalculateDraftOrderResponse = Awaited<ReturnType<typeof calculateDraftOrder>>;

export type CreateWorkOrderResponse = { name: string };

export type CreateWorkOrderRequestResponse = { name: string };

export type FetchWorkOrderInfoPageResponse = Awaited<ReturnType<typeof getWorkOrderInfoPage>>;

export type FetchWorkOrderResponse = NonNullable<Awaited<ReturnType<typeof getWorkOrder>>>;
