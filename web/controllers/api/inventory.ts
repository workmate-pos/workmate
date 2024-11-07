import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { LocalsTeifiUser, Permission } from '../../decorators/permission.js';
import { Request, Response } from 'express-serve-static-core';
import {
  DetailedInventoryMutationItem,
  getInventoryMutationItems,
  getInventoryMutationItemsForMutations,
  getInventoryMutations,
  InventoryMutation,
  InventoryMutationItem,
} from '../../services/inventory/queries.js';
import { InventoryPaginationOptions } from '../../schemas/generated/inventory-pagination-options.js';
import { NestedDateToDateTime } from '../../util/types.js';
import { DateTime } from '../../services/gql/queries/generated/schema.js';
import { InventoryMutationItemsPaginationOptions } from '../../schemas/generated/inventory-mutation-items-pagination-options.js';
import { assertLocationsPermitted } from '../../services/franchises/assert-locations-permitted.js';
import { getLocations } from '../../services/locations/get.js';

@Authenticated()
@Permission('none')
export default class InventoryController {
  @Get('/mutations')
  @QuerySchema('inventory-pagination-options')
  async fetchInventoryMutations(
    req: Request<unknown, unknown, unknown, InventoryPaginationOptions>,
    res: Response<FetchInventoryMutationsResponse>,
  ) {
    const session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { initiatorType, initiatorName, locationId, ...paginationOptions } = req.query;

    const locationIds = locationId ? [locationId] : [];

    if (locationIds.length > 0) {
      await assertLocationsPermitted({ shop: session.shop, locationIds, staffMemberId: user.staffMember.id });
    } else {
      locationIds.push(
        ...(await getLocations(session, user.user.allowedLocationIds).then(locations =>
          locations.map(location => location.id),
        )),
      );
    }

    const initiator = initiatorType && initiatorName ? { type: initiatorType, name: initiatorName } : undefined;

    const { mutations, hasNextPage } = await getInventoryMutations(session.shop, {
      ...paginationOptions,
      locationIds,
      initiator,
      limit: paginationOptions.limit ?? 100,
    });

    const inventoryMutationIds = mutations.map(mutation => mutation.id);
    const inventoryMutationItems = await getInventoryMutationItemsForMutations({ inventoryMutationIds });

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

  @Get('/mutation-items')
  @QuerySchema('inventory-mutation-items-pagination-options')
  async fetchInventoryMutationItems(
    req: Request<unknown, unknown, unknown, InventoryMutationItemsPaginationOptions>,
    res: Response<FetchInventoryMutationItemsResponse>,
  ) {
    const session = res.locals.shopify.session;
    const { initiatorType, initiatorName, locationId, ...paginationOptions } = req.query;

    const locationIds = locationId ? [locationId] : [];

    if (locationIds.length > 0) {
      await assertLocationsPermitted({
        shop: session.shop,
        locationIds,
        staffMemberId: res.locals.teifi.user.staffMember.id,
      });
    } else {
      locationIds.push(
        ...(await getLocations(session, res.locals.teifi.user.user.allowedLocationIds).then(locations =>
          locations.map(location => location.id),
        )),
      );
    }

    const initiator = initiatorType && initiatorName ? { type: initiatorType, name: initiatorName } : undefined;

    const { items, hasNextPage } = await getInventoryMutationItems(session.shop, {
      ...paginationOptions,
      locationIds,
      initiator,
      limit: paginationOptions.limit ?? 100,
    });

    return res.json({
      items: items.map(({ createdAt, updatedAt, ...item }) => ({
        ...item,
        createdAt: createdAt.toISOString() as DateTime,
        updatedAt: updatedAt.toISOString() as DateTime,
      })),
      hasNextPage,
    });
  }
}

export type FetchInventoryMutationsResponse = {
  mutations: NestedDateToDateTime<(InventoryMutation & { items: InventoryMutationItem[] })[]>;
  hasNextPage: boolean;
};

export type FetchInventoryMutationItemsResponse = {
  items: NestedDateToDateTime<DetailedInventoryMutationItem[]>;
  hasNextPage: boolean;
};
