import { Authenticated, Delete, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import {
  deleteSupplier,
  getSupplier,
  getSuppliers,
  Supplier,
  upsertSupplier,
} from '../../services/suppliers/queries.js';
import { Request, Response } from 'express-serve-static-core';
import { SupplierPaginationOptions } from '../../schemas/generated/supplier-pagination-options.js';
import { Session } from '@shopify/shopify-api';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { z } from 'zod';
import { CreateSupplier } from '../../schemas/generated/create-supplier.js';
import { getPurchaseOrderCountBySupplier } from '../../services/purchase-orders/queries.js';
import { NestedDateToDateTime } from '../../util/types.js';
import { DateTime } from '../../services/gql/queries/generated/schema.js';

// TODO: Handle vendors - probably best to auto-create them? also def auto create them in migration

@Authenticated()
export default class SuppliersController {
  @Get('/:id')
  async fetchSupplier(req: Request<{ id: string }>, res: Response<FetchSupplierResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const id = parseId(req.params.id);

    const supplier = await getSupplier(shop, { id });

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
    const { shop } = res.locals.shopify.session;
    const paginationOptions = req.query;

    const { suppliers, hasNextPage } = await getSuppliers(shop, paginationOptions);

    return res.json({
      suppliers: suppliers.map(mapSupplier),
      hasNextPage,
    });
  }

  @Post('/')
  async createSupplier(req: Request<unknown, unknown, CreateSupplier>, res: Response<UpsertSupplierResponse>) {
    const { shop } = res.locals.shopify.session;
    const { name } = req.body;

    const existingSupplier = await getSupplier(shop, { name });

    if (existingSupplier) {
      throw new HttpError('Supplier name taken', 400);
    }

    const supplier = await upsertSupplier(shop, { name });

    return res.json(mapSupplier(supplier));
  }

  @Post('/:id')
  async updateSupplier(req: Request<{ id: string }, unknown, Supplier>, res: Response<UpsertSupplierResponse>) {
    const { shop } = res.locals.shopify.session;
    const { name } = req.body;
    const id = parseId(req.params.id);

    const existingSupplier = await getSupplier(shop, { id });

    if (!existingSupplier) {
      throw new HttpError('Supplier not found', 404);
    }

    if (existingSupplier.name !== name) {
      if (await getSupplier(shop, { name })) {
        throw new HttpError('Supplier name taken', 400);
      }
    }

    const supplier = await upsertSupplier(shop, { name });

    return res.json(mapSupplier(supplier));
  }

  @Delete('/:id')
  async deleteSupplier(req: Request<{ id: string }>, res: Response) {
    const { shop }: Session = res.locals.shopify.session;
    const id = parseId(req.params.id);

    const purchaseOrderCount = await getPurchaseOrderCountBySupplier(shop, [id]);

    if (purchaseOrderCount.some(x => x.id === id && x.count > 0)) {
      throw new HttpError('Cannot delete a supplier that is used in purchase orders', 400);
    }

    await deleteSupplier(shop, id);

    return res.sendStatus(200);
  }
}

export type FetchSupplierResponse = NestedDateToDateTime<Supplier>;

export type UpsertSupplierResponse = NestedDateToDateTime<Supplier>;

export type FetchSuppliersResponse = {
  suppliers: NestedDateToDateTime<Supplier>[];
  hasNextPage: boolean;
};

function parseId(id: string) {
  const parsed = z.number().int().positive().safeParse(id);

  if (!parsed.success) {
    throw new HttpError('Invalid supplier id', 400);
  }

  return parsed.data;
}

function mapSupplier(supplier: Supplier): NestedDateToDateTime<Supplier> {
  return {
    ...supplier,
    createdAt: supplier.createdAt.toISOString() as DateTime,
    updatedAt: supplier.updatedAt.toISOString() as DateTime,
  };
}
