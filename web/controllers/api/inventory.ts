import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Permission } from '../../decorators/permission.js';
import { Request, Response } from 'express-serve-static-core';
import {
  getInventoryMutationItems,
  getInventoryMutations,
  InventoryMutation,
  InventoryMutationItem,
} from '../../services/inventory/queries.js';
import { InventoryPaginationOptions } from '../../schemas/generated/inventory-pagination-options.js';
import { NestedDateToDateTime } from '../../util/types.js';
import { DateTime } from '../../services/gql/queries/generated/schema.js';

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

    const inventoryMutationIds = mutations.map(mutation => mutation.id);
    const inventoryMutationItems = await getInventoryMutationItems({ inventoryMutationIds });

    return res.json({
      mutations: mutations.map(({ createdAt, updatedAt, ...mutation }) => ({
        ...mutation,
        createdAt: createdAt.toISOString() as DateTime,
        updatedAt: updatedAt.toISOString() as DateTime,
        items: inventoryMutationItems
          .filter(item => item.inventoryMutationId === mutation.id)
          .map(({ createdAt, updatedAt, ...item }) => ({
            ...item,
            createdAt: createdAt.toISOString() as DateTime,
            updatedAt: updatedAt.toISOString() as DateTime,
          })),
      })),
      hasNextPage,
    });
  }
}

export type FetchInventoryMutationsResponse = {
  mutations: NestedDateToDateTime<(InventoryMutation & { items: InventoryMutationItem[] })[]>;
  hasNextPage: boolean;
};
