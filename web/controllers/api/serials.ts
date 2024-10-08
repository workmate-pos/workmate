import { Authenticated, BodySchema, Get, Post } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { DetailedSerial, getDetailedSerial, getDetailedSerialsPage } from '../../services/serials/get.js';
import { SerialPaginationOptions } from '../../schemas/generated/serial-pagination-options.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { CreateSerial } from '../../schemas/generated/create-serial.js';
import { upsertSerial } from '../../services/serials/upsert.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { LocalsTeifiUser, Permission } from '../../decorators/permission.js';

@Authenticated()
@Permission('none')
export default class SerialsController {
  @Get('/')
  @QuerySchema('serial-pagination-options')
  async fetchSerials(
    req: Request<unknown, unknown, unknown, SerialPaginationOptions>,
    res: Response<FetchSerialsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const paginationOptions = req.query;

    const { serials, hasNextPage } = await getDetailedSerialsPage(
      session.shop,
      paginationOptions,
      user.user.allowedLocationIds,
    );

    return res.json({ serials, hasNextPage });
  }

  @Get('/:productVariantId/:serial')
  async fetchSerial(req: Request<{ productVariantId: string; serial: string }>, res: Response<FetchSerialResponse>) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { serial, productVariantId } = req.params;

    return res.json(
      await getDetailedSerial(
        session.shop,
        { serial, productVariantId: createGid('ProductVariant', productVariantId) },
        user.user.allowedLocationIds,
      ),
    );
  }

  @Post('/')
  @BodySchema('create-serial')
  async createSerial(req: Request<unknown, unknown, CreateSerial>, res: Response<CreateSerialResponse>) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const createSerial = req.body;

    await upsertSerial(session, user, createSerial);

    return res.json(
      await getDetailedSerial(
        session.shop,
        { serial: createSerial.serial, productVariantId: createSerial.productVariantId },
        user.user.allowedLocationIds,
      ).then(serial => serial ?? never()),
    );
  }
}

export type FetchSerialsResponse = {
  serials: DetailedSerial[];
  hasNextPage: boolean;
};

export type FetchSerialResponse = DetailedSerial | null;

export type CreateSerialResponse = DetailedSerial;
