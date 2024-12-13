import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { LocalsTeifiUser, Permission } from '../../decorators/permission.js';
import { CreateStockTransfer } from '../../schemas/generated/create-stock-transfer.js';
import { DetailedStockTransfer } from '../../services/stock-transfers/types.js';
import { Session } from '@shopify/shopify-api';
import { upsertCreateStockTransfer } from '../../services/stock-transfers/upsert.js';
import {
  getDetailedStockTransfer,
  getStockTransferCount,
  getStockTransferPage,
} from '../../services/stock-transfers/get.js';
import { Request, Response } from 'express-serve-static-core';
import { StockTransferPaginationOptions } from '../../schemas/generated/stock-transfer-pagination-options.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { StockTransferCountOptions } from '../../schemas/generated/stock-transfer-count-options.js';

@Authenticated()
@Permission('none')
export default class StockTransfersController {
  @Post('/')
  @BodySchema('create-stock-transfer')
  @Permission('write_stock_transfers')
  async createStockTransfer(
    req: Request<unknown, unknown, CreateStockTransfer>,
    res: Response<CreateStockTransferResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const createStockTransfer = req.body;

    const { name } = await upsertCreateStockTransfer(session, user, createStockTransfer);
    const stockTransfer = await getDetailedStockTransfer(session, name, user.user.allowedLocationIds);

    return res.json(stockTransfer);
  }

  @Get('/count')
  @Permission('read_stock_transfers')
  @QuerySchema('stock-transfer-count-options')
  async fetchStockTransferCount(
    req: Request<unknown, unknown, unknown, StockTransferCountOptions>,
    res: Response<FetchStockTransferCountResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const countOptions = req.query;

    const stockTransferCount = await getStockTransferCount(session, countOptions, user.user.allowedLocationIds);

    return res.json({ count: stockTransferCount });
  }

  @Get('/')
  @Permission('read_stock_transfers')
  @QuerySchema('stock-transfer-pagination-options')
  async fetchStockTransfers(
    req: Request<unknown, unknown, unknown, StockTransferPaginationOptions>,
    res: Response<FetchStockTransferPageResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const paginationOptions = req.query;

    const stockTransfers = await getStockTransferPage(session, paginationOptions, user.user.allowedLocationIds);

    return res.json(stockTransfers);
  }

  @Get('/:name')
  @Permission('read_stock_transfers')
  async fetchStockTransfer(req: Request<{ name: string }>, res: Response<FetchStockTransferResponse>) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { name } = req.params;

    const stockTransfer = await getDetailedStockTransfer(session, name, user.user.allowedLocationIds);

    if (!stockTransfer) {
      throw new HttpError(`Stock transfer ${name} not found`, 404);
    }

    return res.json(stockTransfer);
  }
}

export type CreateStockTransferResponse = DetailedStockTransfer;

export type FetchStockTransferPageResponse = DetailedStockTransfer[];

export type FetchStockTransferCountResponse = { count: number };

export type FetchStockTransferResponse = DetailedStockTransfer;
