import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Permission } from '../../decorators/permission.js';
import { CreateStockTransfer } from '../../schemas/generated/create-stock-transfer.js';
import { StockTransfer } from '../../services/stock-transfers/types.js';
import { Session } from '@shopify/shopify-api';
import { upsertStockTransfer } from '../../services/stock-transfers/upsert.js';
import { getStockTransfer, getStockTransferCount, getStockTransferPage } from '../../services/stock-transfers/get.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { Request, Response } from 'express-serve-static-core';
import { StockTransferPaginationOptions } from '../../schemas/generated/stock-transfer-pagination-options.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { StockTransferCountOptions } from '../../schemas/generated/stock-transfer-count-options.js';

export default class StockTransfersController {
  @Post('/')
  @BodySchema('create-stock-transfer')
  @Authenticated()
  @Permission('write_stock_transfers')
  async createStockTransfer(
    req: Request<unknown, unknown, CreateStockTransfer>,
    res: Response<CreateStockTransferResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const createStockTransfer = req.body;

    const { name } = await upsertStockTransfer(session, createStockTransfer);
    const stockTransfer = await getStockTransfer(session, name);

    return res.json(stockTransfer ?? never());
  }

  @Get('/count')
  @Authenticated()
  @Permission('read_stock_transfers')
  @QuerySchema('stock-transfer-count-options')
  async fetchStockTransferCount(
    req: Request<unknown, unknown, unknown, StockTransferCountOptions>,
    res: Response<FetchStockTransferCountResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const countOptions = req.query;

    const stockTransferCount = await getStockTransferCount(session, countOptions);

    return res.json({ count: stockTransferCount });
  }

  @Get('/')
  @Authenticated()
  @Permission('read_stock_transfers')
  @QuerySchema('stock-transfer-pagination-options')
  async fetchStockTransfers(
    req: Request<unknown, unknown, unknown, StockTransferPaginationOptions>,
    res: Response<FetchStockTransferPageResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const stockTransfers = await getStockTransferPage(session, paginationOptions);

    return res.json(stockTransfers);
  }

  @Get('/:name')
  @Authenticated()
  @Permission('read_stock_transfers')
  async fetchStockTransfer(req: Request<{ name: string }>, res: Response<FetchStockTransferResponse>) {
    const session: Session = res.locals.shopify.session;
    const { name } = req.params;

    const stockTransfer = await getStockTransfer(session, name);

    if (!stockTransfer) {
      throw new HttpError(`Stock transfer ${name} not found`, 404);
    }

    return res.json(stockTransfer);
  }
}

export type CreateStockTransferResponse = StockTransfer;

export type FetchStockTransferPageResponse = StockTransfer[];

export type FetchStockTransferCountResponse = { count: number };

export type FetchStockTransferResponse = StockTransfer;
