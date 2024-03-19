import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../../services/gql/gql.js';
import type { Request, Response } from 'express-serve-static-core';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { InventoryItemPaginationOptions } from '../../schemas/generated/inventory-item-pagination-options.js';
import { InventoryItemIds } from '../../schemas/generated/inventory-item-ids.js';

@Authenticated()
export default class InventoryItemsController {
  @Get('/')
  @QuerySchema('inventory-item-pagination-options')
  async fetchInventoryItems(
    req: Request<unknown, unknown, unknown, InventoryItemPaginationOptions>,
    res: Response<FetchInventoryItemsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const graphql = new Graphql(session);
    const response = await gql.inventoryItems.getPage.run(graphql, paginationOptions);

    const inventoryItems = response.inventoryItems.nodes;
    const pageInfo = response.inventoryItems.pageInfo;

    return res.json({ inventoryItems, pageInfo });
  }

  @Get('/by-ids')
  @QuerySchema('inventory-item-ids')
  async fetchInventoryItemsByIds(
    req: Request<unknown, unknown, unknown, InventoryItemIds>,
    res: Response<FetchInventoryItemsByIdResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { inventoryItemIds, locationId } = req.query;

    const graphql = new Graphql(session);
    const { nodes } = await gql.inventoryItems.getMany.run(graphql, { ids: inventoryItemIds, locationId });

    const inventoryItems = nodes.filter(
      (node): node is null | (gql.inventoryItems.getMany.Result['nodes'][number] & { __typename: 'InventoryItem' }) =>
        node === null || node.__typename === 'InventoryItem',
    );

    return res.json({ inventoryItems });
  }

  @Get('/id/:locationId/:id')
  async fetchInventoryItem(
    req: Request<{ locationId: ID; inventoryItemId: ID }>,
    res: Response<FetchInventoryItemResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { locationId, inventoryItemId } = req.params;

    const graphql = new Graphql(session);
    const { inventoryItem } = await gql.inventoryItems.get.run(graphql, { id: inventoryItemId, locationId });

    return res.json({ inventoryItem });
  }
}

export type FetchInventoryItemsResponse = {
  inventoryItems: gql.inventoryItems.getPage.Result['inventoryItems']['nodes'];
  pageInfo: gql.inventoryItems.getPage.Result['inventoryItems']['pageInfo'];
};

export type FetchInventoryItemsByIdResponse = {
  inventoryItems: (gql.inventoryItems.InventoryItemFragment.Result | null)[];
};

export type FetchInventoryItemResponse = {
  inventoryItem: gql.inventoryItems.InventoryItemFragment.Result | null;
};
