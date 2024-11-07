import {
  Authenticated,
  BodySchema,
  Delete,
  Get,
  Post,
  QuerySchema,
} from '@teifi-digital/shopify-app-express/decorators';
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
import { UpsertPurchaseOrderReceipt } from '../../schemas/generated/upsert-purchase-order-receipt.js';
import { upsertReceipt } from '../../services/purchase-orders/receipt.js';
import { deletePurchaseOrder, deletePurchaseOrderReceipt } from '../../services/purchase-orders/delete.js';
import { PlanReorder } from '../../schemas/generated/plan-reorder.js';
import { getReorderQuantities } from '../../services/reorder/plan.js';
import { BulkCreatePurchaseOrders } from '../../schemas/generated/bulk-create-purchase-orders.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { getReorderPointCsvTemplatesZip, readReorderPointCsvImport } from '../../services/reorder/csv-import.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getLocations } from '../../services/locations/get.js';
import { ID, isGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { assertLocationsPermitted } from '../../services/franchises/assert-locations-permitted.js';
import { getReorderPoints, ReorderPoint, upsertReorderPoints } from '../../services/reorder/queries.js';
import { ReorderPoints } from '../../schemas/generated/reorder-points.js';
import { CreateReorderPoint } from '../../schemas/generated/create-reorder-point.js';
import { syncInventoryQuantities } from '../../services/inventory/sync.js';
import { BulkDeletePurchaseOrders } from '../../schemas/generated/bulk-delete-purchase-orders.js';

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

  @Delete('/bulk')
  @Permission('write_purchase_orders')
  @Authenticated()
  @BodySchema('bulk-delete-purchase-orders')
  async bulkDeletePurchaseOrders(req: Request<unknown, unknown, BulkDeletePurchaseOrders>, res: Response) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const bulkDeletePurchaseOrders = req.body;

    const purchaseOrders = await Promise.all(
      bulkDeletePurchaseOrders.purchaseOrders.map(({ name }) =>
        deletePurchaseOrder(session, user, name).then(
          () => ({ type: 'success', purchaseOrder: { name } }) as const,
          error => ({ type: 'error', error }) as const,
        ),
      ),
    );

    return res.status(200).json({
      purchaseOrders: purchaseOrders.map((result, i) => {
        if (result.type === 'success') {
          return result;
        }

        if (result.error instanceof HttpError) {
          return {
            type: 'error',
            error: result.error.message,
          };
        }

        sentryErr(result.error, { name: bulkDeletePurchaseOrders.purchaseOrders[i]?.name });

        return {
          type: 'error',
          error: 'Internal server error',
        };
      }),
    });
  }

  @Delete('/:name')
  @Permission('write_purchase_orders')
  @Authenticated()
  async deletePurchaseOrder(req: Request<{ name: string }, unknown, unknown>, res: Response) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { name } = req.params;

    await deletePurchaseOrder(session, user, name);

    return res.json({ success: true });
  }

  @Post('/:name/receipts')
  @Permission('write_purchase_orders')
  @BodySchema('upsert-purchase-order-receipt')
  @Authenticated()
  async createPurchaseOrderReceipt(
    req: Request<{ name: string }, unknown, UpsertPurchaseOrderReceipt>,
    res: Response<UpsertPurchaseOrderReceiptResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { name } = req.params;
    const receipt = req.body;

    await upsertReceipt(session, name, receipt, user.user.allowedLocationIds);

    return res.json({
      purchaseOrder:
        (await getDetailedPurchaseOrder(session, name, user.user.allowedLocationIds)) ??
        never('upsertReceipt would have thrown if not this doesnt exist'),
    });
  }

  @Delete('/:purchaseOrderName/receipts/:receiptName')
  @Permission('write_purchase_orders')
  @Authenticated()
  async deletePurchaseOrderReceipt(
    req: Request<{ purchaseOrderName: string; receiptName: string }>,
    res: Response<DeletePurchaseOrderReceiptResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { purchaseOrderName, receiptName } = req.params;

    await deletePurchaseOrderReceipt(session, user, { purchaseOrderName, receiptName });

    return res.json({
      purchaseOrder:
        (await getDetailedPurchaseOrder(session, purchaseOrderName, user.user.allowedLocationIds)) ??
        never('upsertReceipt would have thrown if not this doesnt exist'),
    });
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

    if (!z.string().email().optional().safeParse(replyTo).success) {
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
          { replyTo: replyTo ?? '', from },
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

  @Get('/upload/csv/templates')
  async getPurchaseOrderCsvTemplates(req: Request, res: Response) {
    const zip = await getPurchaseOrderCsvTemplatesZip();

    res.attachment('purchase-order-csv-templates.zip');
    res.setHeader('Content-Type', 'application/zip');
    res.end(zip);
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

  // TODO: After QA, move all reorder endpoints to their own controller
  @Get('/reorder/upload/csv/templates')
  async getReorderPointCsvTemplates(req: Request, res: Response) {
    const zip = await getReorderPointCsvTemplatesZip();

    res.attachment('reorder-point-csv-templates.zip');
    res.setHeader('Content-Type', 'application/zip');
    res.end(zip);
  }

  @Post('/reorder/upload/csv')
  @Authenticated()
  @Permission('write_settings')
  async uploadReorderPointsCsv(req: Request, res: Response) {
    const session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    const [shopLocations, createReorderPoints] = await Promise.all([
      getLocations(session, user.user.allowedLocationIds),
      readReorderPointCsvImport({
        formData: req,
        headers: req.headers,
      }),
    ]);

    for (const { min, max } of createReorderPoints) {
      if (max <= min) {
        throw new HttpError('Maximum stock level must be greater than minimum stock level', 400);
      }
    }

    const shopLocationIds = shopLocations.map(location => location.id);
    const locationIds = unique(createReorderPoints.flatMap(reorderPoint => reorderPoint.locationId ?? shopLocationIds));

    await assertLocationsPermitted({
      shop: session.shop,
      staffMemberId: user.staffMember.id,
      locationIds,
    });

    await upsertReorderPoints(
      session.shop,
      createReorderPoints.map(({ min, max, inventoryItemId, locationId = null }) => ({
        min,
        max,
        inventoryItemId,
        locationId,
      })),
    );

    const inventoryItemIds = unique(createReorderPoints.map(reorderPoint => reorderPoint.inventoryItemId));

    syncInventoryQuantities(session, inventoryItemIds).catch(error => sentryErr(error, { createReorderPoints }));

    return res.status(202).json({ success: true });
  }

  @Get('/reorder/plan')
  @Authenticated()
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

  @Post('/bulk')
  @Authenticated()
  @BodySchema('bulk-create-purchase-orders')
  @Permission('write_purchase_orders')
  async bulkCreatePurchaseOrder(
    req: Request<unknown, unknown, BulkCreatePurchaseOrders>,
    res: Response<BulkCreatePurchaseOrdersResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const bulkCreatePurchaseOrder = req.body;

    const purchaseOrders = await Promise.all(
      bulkCreatePurchaseOrder.purchaseOrders.map(createPurchaseOrder =>
        upsertCreatePurchaseOrder(session, user, createPurchaseOrder).then(
          purchaseOrder =>
            ({
              type: 'success',
              purchaseOrder,
            }) as const,
          error =>
            ({
              type: 'error',
              error,
            }) as const,
        ),
      ),
    );

    return res.status(200).json({
      purchaseOrders: purchaseOrders.map((result, i) => {
        if (result.type === 'success') {
          return result;
        }

        if (result.error instanceof HttpError) {
          return {
            type: 'error',
            error: result.error.message,
          };
        }

        sentryErr(result.error, { createPurchaseOrder: bulkCreatePurchaseOrder.purchaseOrders[i] });

        return {
          type: 'error',
          error: 'Internal server error',
        };
      }),
    });
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

    const locationIds = locationId
      ? [locationId]
      : await getLocations(session, user.user.allowedLocationIds).then(locations =>
          locations.map(location => location.id),
        );

    await assertLocationsPermitted({
      shop: session.shop,
      staffMemberId: user.staffMember.id,
      locationIds,
    });

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

    const locationIds = locationId
      ? [locationId]
      : await getLocations(session, user.user.allowedLocationIds).then(locations =>
          locations.map(location => location.id),
        );

    await assertLocationsPermitted({
      shop: session.shop,
      staffMemberId: user.staffMember.id,
      locationIds,
    });

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

export type PlanReorderResponse = {
  min: number;
  max: number;
  orderQuantity: number;
  availableQuantity: number;
  incomingQuantity: number;
  inventoryItemId: ID;
  productVariantId: ID;
  vendor: string;
}[];

export type BulkCreatePurchaseOrdersResponse = {
  purchaseOrders: (
    | {
        type: 'success';
        purchaseOrder: {
          name: string;
        };
      }
    | {
        type: 'error';
        error: string;
      }
  )[];
};

export type BulkDeletePurchaseOrdersResponse = {
  purchaseOrders: (
    | {
        type: 'success';
        purchaseOrder: {
          name: string;
        };
      }
    | {
        type: 'error';
        error: string;
      }
  )[];
};

export type ReorderPointResponse = {
  reorderPoint: ReorderPoint;
};

export type CreateReorderPointResponse = {
  reorderPoint: ReorderPoint;
};

export type UpsertPurchaseOrderReceiptResponse = {
  purchaseOrder: DetailedPurchaseOrder;
};

export type DeletePurchaseOrderReceiptResponse = {
  purchaseOrder: DetailedPurchaseOrder;
};
