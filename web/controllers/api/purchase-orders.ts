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
import { deletePurchaseOrderReceipt } from '../../services/purchase-orders/delete.js';

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

  @Delete('/:name/receipts/:id')
  @Permission('write_purchase_orders')
  @Authenticated()
  async deletePurchaseOrderReceipt(
    req: Request<{ name: string; id: string }>,
    res: Response<DeletePurchaseOrderReceiptResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { name, id } = req.params;

    const parsedId = z.coerce.number().int().safeParse(id);

    if (!parsedId.success) {
      throw new HttpError('Invalid receipt id', 400);
    }

    await deletePurchaseOrderReceipt(session, user, { name, id: parsedId.data });

    return res.json({
      purchaseOrder:
        (await getDetailedPurchaseOrder(session, name, user.user.allowedLocationIds)) ??
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

export type UpsertPurchaseOrderReceiptResponse = {
  purchaseOrder: DetailedPurchaseOrder;
};

export type DeletePurchaseOrderReceiptResponse = {
  purchaseOrder: DetailedPurchaseOrder;
};
