import { Session } from '@shopify/shopify-api';
import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import type { WorkOrderPaginationOptions } from '../../schemas/generated/work-order-pagination-options.js';
import type { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { getDetailedWorkOrder, getWorkOrderInfoPage } from '../../services/work-orders/get.js';
import { getShopSettings } from '../../services/settings/settings.js';
import { upsertWorkOrder } from '../../services/work-orders/upsert.js';
import { CalculateWorkOrder } from '../../schemas/generated/calculate-work-order.js';
import { calculateWorkOrder } from '../../services/work-orders/calculate.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { LocalsTeifiUser, Permission } from '../../decorators/permission.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { mg } from '../../services/mail/mailgun.js';
import { renderHtmlToPdfCustomFile } from '../../services/mail/html-pdf/renderer.js';
import { getRenderedWorkOrderTemplate, getWorkOrderTemplateData } from '../../services/mail/templates/work-order.js';
import { WorkOrderPrintJob } from '../../schemas/generated/work-order-print-job.js';
import { CreateWorkOrderOrder } from '../../schemas/generated/create-work-order-order.js';
import { createWorkOrderOrder } from '../../services/work-orders/create-order.js';
import { syncShopifyOrders } from '../../services/shopify-order/sync.js';
import { cleanOrphanedDraftOrders } from '../../services/work-orders/clean-orphaned-draft-orders.js';
import { PlanWorkOrderOrder } from '../../schemas/generated/plan-work-order-order.js';
import { getDraftOrderInputForExistingWorkOrder } from '../../services/work-orders/draft-order.js';
import { DraftOrderInput } from '../../services/gql/queries/generated/schema.js';
import { zip } from '@teifi-digital/shopify-app-toolbox/iteration';
import { getWorkOrderCsvTemplatesZip, readWorkOrderCsvImport } from '../../services/work-orders/csv-import.js';
import { transaction } from '../../services/db/transaction.js';
import * as Sentry from '@sentry/node';
import { z } from 'zod';

export default class WorkOrderController {
  @Post('/calculate-draft-order')
  @BodySchema('calculate-work-order')
  @Authenticated()
  @Permission('read_work_orders')
  async getDraftDetails(
    req: Request<unknown, unknown, CalculateWorkOrder>,
    res: Response<CalculateDraftOrderResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    const calculatedDraft = await calculateWorkOrder(session, req.body, user, { includeExistingOrders: true });

    return res.json(calculatedDraft);
  }

  @Post('/')
  @BodySchema('create-work-order')
  @Authenticated()
  @Permission('write_work_orders')
  async createWorkOrder(req: Request<unknown, unknown, CreateWorkOrder>, res: Response<CreateWorkOrderResponse>) {
    const session: Session = res.locals.shopify.session;
    const createWorkOrder = req.body;

    const user: LocalsTeifiUser = res.locals.teifi.user;

    const { name } = await upsertWorkOrder(session, user, createWorkOrder);
    const workOrder = await getDetailedWorkOrder(session, name, user.user.allowedLocationIds);

    return res.json(workOrder ?? never());
  }

  @Post('/create-order')
  @BodySchema('create-work-order-order')
  @Authenticated()
  @Permission('write_work_orders')
  async createWorkOrderOrder(
    req: Request<unknown, unknown, CreateWorkOrderOrder>,
    res: Response<CreateWorkOrderOrderResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    const { order, workOrder } = await createWorkOrderOrder(session, req.body, user);
    await cleanOrphanedDraftOrders(session, workOrder.id, () => syncShopifyOrders(session, [order.id]));

    return res.json(order);
  }

  /**
   * Similar to calculate and create order.
   * This endpoint creates a DraftOrderInput, which can be used by POS
   * to populate the cart.
   */
  @Get('/plan-order')
  @QuerySchema('plan-work-order-order')
  @Authenticated()
  @Permission('write_work_orders')
  async planWorkOrderOrder(
    req: Request<unknown, unknown, unknown, PlanWorkOrderOrder>,
    res: Response<PlanWorkOrderOrderResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { name, chargeUuids = [], itemUuids = [], itemTypes = [], chargeTypes = [] } = req.query;

    if (chargeUuids.length !== chargeTypes.length) {
      throw new HttpError('Charge UUIDs and charge types must be the same length', 400);
    }

    if (itemUuids.length !== itemTypes.length) {
      throw new HttpError('Item UUIDs and item types must be the same length', 400);
    }

    const selectedItems = [...zip(itemTypes, itemUuids)].map(([type, uuid]) => ({ type, uuid }));
    const selectedCharges = [...zip(chargeTypes, chargeUuids)].map(([type, uuid]) => ({ type, uuid }));

    const draftOrderInput = await getDraftOrderInputForExistingWorkOrder(session, name, {
      selectedItems,
      selectedCharges,
    });

    return res.json(draftOrderInput);
  }

  @Get('/')
  @QuerySchema('work-order-pagination-options')
  @Authenticated()
  @Permission('read_work_orders')
  async fetchWorkOrderInfoPage(
    req: Request<unknown, unknown, unknown, WorkOrderPaginationOptions>,
    res: Response<FetchWorkOrderInfoPageResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const paginationOptions = req.query;

    const workOrders = await getWorkOrderInfoPage(session, paginationOptions, user.user.allowedLocationIds);

    return res.json(workOrders);
  }

  @Get('/:name')
  @Authenticated()
  @Permission('read_work_orders')
  async fetchWorkOrder(req: Request<{ name: string }>, res: Response<FetchWorkOrderResponse>) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { name } = req.params;

    const workOrder = await getDetailedWorkOrder(session, name, user.user.allowedLocationIds);

    if (!workOrder) {
      throw new HttpError(`Work order ${name} not found`, 404);
    }

    return res.json(workOrder);
  }

  @Post('/:name/print/:template')
  @Authenticated()
  @Permission('read_work_orders')
  @QuerySchema('work-order-print-job')
  async printWorkOrder(
    req: Request<{ name: string; template: string; dueDate: string }, unknown, unknown, WorkOrderPrintJob>,
    res: Response<PrintWorkOrderResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    const { name, template } = req.params;
    const { date, dueDate, replyTo, from, email } = req.query;

    const { workOrders, printing } = await getShopSettings(session.shop);

    if (!Object.keys(workOrders.printTemplates).includes(template)) {
      throw new HttpError('Unknown print template', 400);
    }

    if (!z.string().email().safeParse(replyTo).success) {
      throw new HttpError('Invalid reply to email', 400);
    }

    if (!z.string().email().safeParse(from).success) {
      throw new HttpError('Invalid from email', 400);
    }

    const printTemplate = workOrders.printTemplates[template] ?? never();
    const context = await getWorkOrderTemplateData(session, name, date, dueDate, user);
    const { subject, html } = await getRenderedWorkOrderTemplate(printTemplate, context);
    const file = await renderHtmlToPdfCustomFile(subject, html);

    await Sentry.startSpan(
      {
        name: 'Sending work order print email',
        attributes: {
          replyTo,
          from,
          email,
          subject,
        },
      },
      () =>
        mg.send(
          { emailReplyTo: replyTo, emailFromTitle: from },
          {
            to: email,
            attachment: [file],
            subject,
            text: 'WorkMate Work Order',
          },
        ),
    );

    return res.json({ success: true });
  }

  @Post('/upload/csv')
  @Authenticated()
  @Permission('write_work_orders')
  async uploadWorkOrdersCsv(req: Request, res: Response) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    const createWorkOrders = await readWorkOrderCsvImport({
      formData: req.body,
      headers: req.headers,
    });

    await transaction(async () => {
      for (const createWorkOrder of createWorkOrders) {
        await upsertWorkOrder(session, user, createWorkOrder);
      }
    });

    return res.json({ success: true });
  }

  @Get('/upload/csv/templates')
  async getWorkOrderCsvTemplates(req: Request, res: Response) {
    const zip = await getWorkOrderCsvTemplatesZip();

    res.attachment('work-order-csv-templates.zip');
    res.setHeader('Content-Type', 'application/zip');
    res.end(zip);
  }
}

export type CalculateDraftOrderResponse = Awaited<ReturnType<typeof calculateWorkOrder>>;

export type CreateWorkOrderResponse = NonNullable<Awaited<ReturnType<typeof getDetailedWorkOrder>>>;

export type CreateWorkOrderRequestResponse = { name: string };

export type FetchWorkOrderInfoPageResponse = Awaited<ReturnType<typeof getWorkOrderInfoPage>>;

export type FetchWorkOrderResponse = NonNullable<Awaited<ReturnType<typeof getDetailedWorkOrder>>>;

export type PrintWorkOrderResponse = { success: true };

export type CreateWorkOrderOrderResponse = {
  name: string;
  id: ID;
};

export type PlanWorkOrderOrderResponse = DraftOrderInput;
