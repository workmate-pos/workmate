import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import type { Request, Response } from 'express-serve-static-core';
import { LocalsTeifiUser, Permission } from '../../decorators/permission.js';
import { PurchaseOrderPaginationOptions } from '../../schemas/generated/purchase-order-pagination-options.js';
import { Session } from '@shopify/shopify-api';
import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { upsertCreatePurchaseOrder } from '../../services/purchase-orders/upsert.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getDetailedPurchaseOrder, getPurchaseOrderInfoPage } from '../../services/purchase-orders/get.js';
import { DetailedPurchaseOrder, PurchaseOrderInfo } from '../../services/purchase-orders/types.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { OffsetPaginationOptions } from '../../schemas/generated/offset-pagination-options.js';
import { db } from '../../services/db/db.js';
import { PurchaseOrderPrintJob } from '../../schemas/generated/purchase-order-print-job.js';
import { getShopSettings } from '../../services/settings/settings.js';
import {
  getPurchaseOrderTemplateData,
  getRenderedPurchaseOrderTemplate,
} from '../../services/mail/templates/purchase-order.js';
import { renderHtmlToPdfCustomFile } from '../../services/mail/html-pdf/renderer.js';
import { mg } from '../../services/mail/mailgun.js';
import { transaction } from '../../services/db/transaction.js';
import {
  getPurchaseOrderCsvTemplatesZip,
  readPurchaseOrderCsvImport,
} from '../../services/purchase-orders/csv-import.js';
import * as Sentry from '@sentry/node';
import { z } from 'zod';
import { PlanReorder } from '../../schemas/generated/plan-reorder.js';
import { getReorderQuantities } from '../../services/reorder/plan.js';
import { ID, isGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertLocationsPermitted } from '../../services/franchises/assert-locations-permitted.js';
import { getReorderPoints, ReorderPoint, upsertReorderPoints } from '../../services/reorder/queries.js';
import { ReorderPoints } from '../../schemas/generated/reorder-points.js';
import { CreateReorderPoint } from '../../schemas/generated/create-reorder-point.js';
import { syncInventoryQuantities } from '../../services/inventory/sync.js';

export default class PurchaseOrdersController {
  @Post('/')
  @BodySchema('create-purchase-order')
  @Permission('write_purchase_orders')
  @Authenticated()
  async createPurchaseOrder(
    req: Request<unknown, unknown, CreatePurchaseOrder>,
    res: Response<CreatePurchaseOrderResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const createPurchaseOrder = req.body;

    const { name } = await upsertCreatePurchaseOrder(session, user, createPurchaseOrder);
    const purchaseOrder = await getDetailedPurchaseOrder(session, name, user.user.allowedLocationIds).then(
      po => po ?? never('We just made it XD'),
    );

    return res.json({ purchaseOrder });
  }

  @Get('/:name')
  @Permission('read_purchase_orders')
  @Authenticated()
  async fetchPurchaseOrder(req: Request<{ name: string }>, res: Response<FetchPurchaseOrderResponse>) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { name } = req.params;

    const purchaseOrder = await getDetailedPurchaseOrder(session, name, user.user.allowedLocationIds);

    if (!purchaseOrder) {
      throw new HttpError(`Purchase order ${name} not found`, 404);
    }

    return res.json({ purchaseOrder });
  }

  @Get('/')
  @QuerySchema('purchase-order-pagination-options')
  @Permission('read_purchase_orders')
  @Authenticated()
  async fetchPurchaseOrderPage(
    req: Request<unknown, unknown, unknown, PurchaseOrderPaginationOptions>,
    res: Response<FetchPurchaseOrderInfoPageResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const paginationOptions = req.query;

    const purchaseOrders = await getPurchaseOrderInfoPage(session, paginationOptions, user.user.allowedLocationIds);

    return res.json({ purchaseOrders });
  }

  @Post('/:name/print/:template')
  @Authenticated()
  @Permission('read_purchase_orders')
  @QuerySchema('purchase-order-print-job')
  @Authenticated()
  async printWorkOrder(
    req: Request<{ name: string; template: string }, unknown, unknown, PurchaseOrderPrintJob>,
    res: Response<PrintPurchaseOrderResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { name, template } = req.params;
    const { date, replyTo, from, email } = req.query;

    const { purchaseOrders } = await getShopSettings(session.shop);

    if (!Object.keys(purchaseOrders.printTemplates).includes(template)) {
      throw new HttpError('Unknown print template', 400);
    }

    if (!z.string().email().safeParse(email).success) {
      throw new HttpError('Invalid destination email address', 400);
    }

    if (!z.string().email().safeParse(replyTo).success) {
      throw new HttpError('Invalid reply-to email address', 400);
    }

    const printTemplate = purchaseOrders.printTemplates[template] ?? never();
    const context = await getPurchaseOrderTemplateData(session, name, date, user);
    const { subject, html } = await getRenderedPurchaseOrderTemplate(printTemplate, context);
    const file = await renderHtmlToPdfCustomFile(subject, html);

    await Sentry.startSpan(
      {
        name: 'Sending purchase order print email',
        attributes: {
          replyTo,
          from,
          email,
          subject,
        },
      },
      () =>
        mg.send(
          { replyTo, from },
          {
            to: email,
            attachment: [file],
            subject,
            text: 'WorkMate Purchase Order',
          },
        ),
    );

    return res.json({ success: true });
  }

  @Post('/upload/csv')
  @Authenticated()
  @Permission('write_purchase_orders')
  async uploadPurchaseOrdersCsv(req: Request, res: Response) {
    const session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    const createPurchaseOrders = await readPurchaseOrderCsvImport({
      formData: req,
      headers: req.headers,
    });

    await transaction(async () => {
      for (const createPurchaseOrder of createPurchaseOrders) {
        await upsertCreatePurchaseOrder(session, user, createPurchaseOrder);
      }
    });

    return res.json({ success: true });
  }

  @Get('/upload/csv/templates')
  async getPurchaseOrderCsvTemplates(req: Request, res: Response) {
    const zip = await getPurchaseOrderCsvTemplatesZip();

    res.attachment('purchase-order-csv-templates.zip');
    res.setHeader('Content-Type', 'application/zip');
    res.end(zip);
  }

  @Get('/reorder/plan')
  @QuerySchema('plan-reorder')
  @Permission('write_purchase_orders')
  @Permission('read_purchase_orders')
  async planReorder(req: Request<unknown, unknown, unknown, PlanReorder>, res: Response<PlanReorderResponse>) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { locationId } = req.query;

    const plan = await getReorderQuantities(session, locationId, user);

    return res.json(plan);
  }

  @Get('/reorder/:inventoryItemId')
  @QuerySchema('reorder-points')
  @Permission('read_settings')
  @Authenticated()
  async getReorderPoint(
    req: Request<{ inventoryItemId: string }, unknown, unknown, ReorderPoints>,
    res: Response<ReorderPointResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { inventoryItemId } = req.params;
    const { locationId } = req.query;

    if (!isGid(inventoryItemId)) {
      throw new HttpError('Invalid inventory item id', 400);
    }

    if (locationId) {
      await assertLocationsPermitted({
        shop: session.shop,
        staffMemberId: user.staffMember.id,
        locationIds: [locationId],
      });
    }

    const [reorderPoint] = await getReorderPoints({
      shop: session.shop,
      inventoryItemIds: [inventoryItemId],
      ...(locationId ? { locationIds: [locationId] } : {}),
    });

    if (!reorderPoint) {
      throw new HttpError('Reorder point not found', 404);
    }

    return res.json({ reorderPoint });
  }

  @Post('/reorder')
  @BodySchema('create-reorder-point')
  @Permission('write_settings')
  @Authenticated()
  async createReorderPoint(
    req: Request<unknown, unknown, CreateReorderPoint>,
    res: Response<CreateReorderPointResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { inventoryItemId, locationId, min, max } = req.body;

    if (locationId) {
      await assertLocationsPermitted({
        shop: session.shop,
        staffMemberId: user.staffMember.id,
        locationIds: [locationId],
      });
    }

    if (max <= min) {
      throw new HttpError('Maximum stock level must be greater than minimum stock level', 400);
    }

    await Promise.all([
      syncInventoryQuantities(session, [inventoryItemId]),
      upsertReorderPoints(session.shop, [
        {
          inventoryItemId,
          locationId: locationId || null,
          min,
          max,
        },
      ]),
    ]);

    const [reorderPoint] = await getReorderPoints({
      shop: session.shop,
      inventoryItemIds: [inventoryItemId],
      ...(locationId ? { locationIds: [locationId] } : {}),
    });

    if (!reorderPoint) {
      throw new HttpError('Reorder point not found after creation', 404);
    }

    return res.json({ reorderPoint });
  }
}

export type FetchPurchaseOrderInfoPageResponse = {
  purchaseOrders: PurchaseOrderInfo[];
};

export type CreatePurchaseOrderResponse = {
  purchaseOrder: DetailedPurchaseOrder;
};

export type FetchPurchaseOrderResponse = {
  purchaseOrder: DetailedPurchaseOrder;
};

export type PrintPurchaseOrderResponse = { success: true };

export type PlanReorderResponse = { quantity: number; inventoryItemId: ID; vendor: string }[];

export type ReorderPointResponse = {
  reorderPoint: ReorderPoint;
};

export type CreateReorderPointResponse = {
  reorderPoint: ReorderPoint;
};
