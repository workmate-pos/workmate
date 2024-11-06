import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Permission } from '../../decorators/permission.js';
import { Request, Response } from 'express-serve-static-core';
import { getInventoryMutations } from '../../services/inventory/queries.js';
import { InventoryPaginationOptions } from '../../schemas/generated/inventory-pagination-options.js';

@Authenticated()
@Permission('none')
export default class InventoryController {
  @Get('/mutations')
  @QuerySchema('inventory-pagination-options')
  async fetchInventoryMutations(
    req: Request<unknown, unknown, unknown, InventoryPaginationOptions>,
    res: Response<FetchInventoryMutationsResponse>,
  ) {
    const { shop } = res.locals.shopify.session;
    const { initiatorType, initiatorName, ...paginationOptions } = req.query;

    const initiator = initiatorType && initiatorName ? { type: initiatorType, name: initiatorName } : undefined;

    const { mutations, hasNextPage } = await getInventoryMutations(shop, {
      ...paginationOptions,
      initiator,
      limit: paginationOptions.limit ?? 100,
    });

    return res.json({
      mutations,
      hasNextPage,
    });
  }
}

export type FetchInventoryMutationsResponse = {
  mutations: {
    id: number;
    shop: string;
    type: 'MOVE' | 'SET' | 'ADJUST';
    initiatorType: 'PURCHASE_ORDER' | 'STOCK_TRANSFER' | 'CYCLE_COUNT';
    initiatorName: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  hasNextPage: boolean;
};
