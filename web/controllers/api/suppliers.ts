import {
  Authenticated,
  BodySchema,
  Delete,
  Get,
  Post,
  QuerySchema,
} from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { SupplierPaginationOptions } from '../../schemas/generated/supplier-pagination-options.js';
import { Session } from '@shopify/shopify-api';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { z } from 'zod';
import { CreateSupplier } from '../../schemas/generated/create-supplier.js';
import { NestedDateToDateTime } from '../../util/types.js';
import { DateTime } from '../../services/gql/queries/generated/schema.js';
import { Permission } from '../../decorators/permission.js';
import { upsertSupplier } from '../../services/suppliers/upsert.js';
import { unit } from '../../services/db/unit-of-work.js';
import { DetailedSupplier, getDetailedSupplier, getDetailedSuppliers } from '../../services/suppliers/get.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { deleteSupplier } from '../../services/suppliers/delete.js';

@Authenticated()
export default class SuppliersController {
  @Get('/:id')
  async fetchSupplier(req: Request<{ id: string }>, res: Response<FetchSupplierResponse>) {
    const session: Session = res.locals.shopify.session;
    const id = parseId(req.params.id);

    const supplier = await getDetailedSupplier(session, id);

    if (!supplier) {
      throw new HttpError('Supplier not found', 404);
    }

    return res.json(mapSupplier(supplier));
  }

  @Get('/')
  @QuerySchema('supplier-pagination-options')
  async fetchSuppliers(
    req: Request<unknown, unknown, unknown, SupplierPaginationOptions>,
    res: Response<FetchSuppliersResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const { suppliers, hasNextPage } = await getDetailedSuppliers(session, paginationOptions);

    return res.json({
      suppliers: suppliers.map(mapSupplier),
      hasNextPage,
    });
  }

  @Post('/')
  @Permission('write_suppliers')
  @BodySchema('create-supplier')
  async createSupplier(req: Request<unknown, unknown, CreateSupplier>, res: Response<UpsertSupplierResponse>) {
    const session: Session = res.locals.shopify.session;

    const supplier = await unit(async () => {
      const id = await upsertSupplier(session, null, req.body);
      return await getDetailedSupplier(session, id).then(supplier => supplier ?? never());
    });

    return res.json(mapSupplier(supplier));
  }

  @Post('/:id')
  @Permission('write_suppliers')
  @BodySchema('create-supplier')
  async updateSupplier(req: Request<{ id: string }, unknown, CreateSupplier>, res: Response<UpsertSupplierResponse>) {
    const session = res.locals.shopify.session;
    const id = parseId(req.params.id);

    const supplier = await unit(async () => {
      await upsertSupplier(session, id, req.body);
      return await getDetailedSupplier(session, id).then(supplier => supplier ?? never());
    });

    return res.json(mapSupplier(supplier));
  }

  @Delete('/:id')
  @Permission('write_suppliers')
  async deleteSupplier(req: Request<{ id: string }>, res: Response) {
    const { shop }: Session = res.locals.shopify.session;
    const id = parseId(req.params.id);

    await deleteSupplier(shop, id);

    return res.sendStatus(200);
  }
}

function parseId(id: string) {
  const parsed = z.coerce.number().int().positive().safeParse(id);

  if (!parsed.success) {
    throw new HttpError('Invalid supplier id', 400);
  }

  return parsed.data;
}

function mapSupplier(supplier: DetailedSupplier): NestedDateToDateTime<DetailedSupplier> {
  return {
    ...supplier,
    createdAt: supplier.createdAt.toISOString() as DateTime,
    updatedAt: supplier.updatedAt.toISOString() as DateTime,
    lastUsedAt: supplier.lastUsedAt.toISOString() as DateTime,
  };
}

export type FetchSupplierResponse = NestedDateToDateTime<DetailedSupplier>;

export type UpsertSupplierResponse = NestedDateToDateTime<DetailedSupplier>;

export type FetchSuppliersResponse = {
  suppliers: NestedDateToDateTime<DetailedSupplier>[];
  hasNextPage: boolean;
};
