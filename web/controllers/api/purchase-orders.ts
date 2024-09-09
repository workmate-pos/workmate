import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import type { Request, Response } from 'express-serve-static-core';
import { Permission } from '../../decorators/permission.js';
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
import { getShopSettings } from '../../services/settings.js';
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
    const createPurchaseOrder = req.body;

    const { name } = await upsertCreatePurchaseOrder(session, createPurchaseOrder);
    const purchaseOrder = await getDetailedPurchaseOrder(session, name).then(po => po ?? never('We just made it XD'));

    return res.json({ purchaseOrder });
  }

  @Get('/:name')
  @Permission('read_purchase_orders')
  @Authenticated()
  async fetchPurchaseOrder(req: Request<{ name: string }>, res: Response<FetchPurchaseOrderResponse>) {
    const session: Session = res.locals.shopify.session;
    const { name } = req.params;

    const purchaseOrder = await getDetailedPurchaseOrder(session, name);

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
    const paginationOptions = req.query;

    const purchaseOrders = await getPurchaseOrderInfoPage(session, paginationOptions);

    return res.json({ purchaseOrders });
  }

  @Get('/common-custom-fields')
  @QuerySchema('offset-pagination-options')
  @Permission('read_purchase_orders')
  @Authenticated()
  async fetchPurchaseOrderCustomFields(
    req: Request<unknown, unknown, unknown, OffsetPaginationOptions>,
    res: Response<FetchPurchaseOrderCustomFieldsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const customFields = await db.purchaseOrder.getCommonCustomFieldsForShop({
      shop: session.shop,
      offset: paginationOptions.offset ?? 0,
      limit: Math.min(paginationOptions.first ?? 10, 100),
      query: paginationOptions.query,
    });

    return res.json({ customFields: customFields.map(field => field.key) });
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
    const { name, template } = req.params;
    const { date } = req.query;

    const { emailReplyTo, emailFromTitle, purchaseOrderPrintTemplates, printEmail } = await getShopSettings(
      session.shop,
    );

    if (!Object.keys(purchaseOrderPrintTemplates).includes(template)) {
      throw new HttpError('Unknown print template', 400);
    }

    if (!printEmail) {
      throw new HttpError('No print email address set', 400);
    }

    const printTemplate = purchaseOrderPrintTemplates[template] ?? never();
    const context = await getPurchaseOrderTemplateData(session, name, date);
    const { subject, html } = await getRenderedPurchaseOrderTemplate(printTemplate, context);
    const file = await renderHtmlToPdfCustomFile(subject, html);

    await Sentry.startSpan(
      {
        name: 'Sending purchase order print email',
        attributes: {
          emailFromTitle,
          emailReplyTo,
          printEmail,
          subject,
        },
      },
      () =>
        mg.send(
          { emailReplyTo, emailFromTitle },
          {
            to: printEmail,
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
  async uploadPurchaseOrdersCsv(req: Request, res: Response) {
    const session = res.locals.shopify.session;

    const createPurchaseOrders = await readPurchaseOrderCsvImport({
      formData: req,
      headers: req.headers,
    });

    await transaction(async () => {
      for (const createPurchaseOrder of createPurchaseOrders) {
        await upsertCreatePurchaseOrder(session, createPurchaseOrder);
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

export type FetchPurchaseOrderCustomFieldsResponse = {
  customFields: string[];
};

export type PrintPurchaseOrderResponse = { success: true };
