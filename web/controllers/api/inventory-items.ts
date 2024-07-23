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
    const { locationId, query, first, after } = req.query;

    const graphql = new Graphql(session);
    const response = locationId
      ? await gql.inventoryItems.getPageWithLocationInventoryLevel.run(graphql, { locationId, query, first, after })
      : await gql.inventoryItems.getPage.run(graphql, { query, first, after }).then(result => ({
          inventoryItems: {
            nodes: result.inventoryItems.nodes.map(node => ({ ...node, inventoryLevel: null })),
            pageInfo: result.inventoryItems.pageInfo,
          },
        }));

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

    const { nodes } = locationId
      ? await gql.inventoryItems.getManyWithLocationInventoryLevel.run(graphql, { ids: inventoryItemIds, locationId })
      : await gql.inventoryItems.getMany.run(graphql, { ids: inventoryItemIds }).then(result => ({
          nodes: result.nodes.map(node => (node ? { ...node, inventoryLevel: null } : null)),
        }));

    const inventoryItems = nodes.filter(
      (
        node,
      ): node is
        | null
        | (gql.inventoryItems.getManyWithLocationInventoryLevel.Result['nodes'][number] & {
            __typename: 'InventoryItem';
          }) => node === null || node.__typename === 'InventoryItem',
    );

    return res.json({ inventoryItems });
  }

  @Get('/:locationId/:id')
  async fetchInventoryItem(
    req: Request<{ locationId: ID; inventoryItemId: ID }>,
    res: Response<FetchInventoryItemResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { locationId, inventoryItemId } = req.params;

    const graphql = new Graphql(session);
    const { inventoryItem } = locationId
      ? await gql.inventoryItems.getWithLocationInventoryLevel.run(graphql, { id: inventoryItemId, locationId })
      : await gql.inventoryItems.get.run(graphql, { id: inventoryItemId, locationId }).then(result => ({
          inventoryItem: result.inventoryItem ? { ...result.inventoryItem, inventoryLevel: null } : null,
        }));

    return res.json({ inventoryItem });
  }
}

export type FetchInventoryItemsResponse = {
  inventoryItems: gql.inventoryItems.getPageWithLocationInventoryLevel.Result['inventoryItems']['nodes'];
  pageInfo: gql.inventoryItems.getPageWithLocationInventoryLevel.Result['inventoryItems']['pageInfo'];
};

export type FetchInventoryItemsByIdResponse = {
  inventoryItems: (
    | (gql.inventoryItems.InventoryItemFragment.Result & gql.inventoryItems.InventoryItemInventoryLevelFragment.Result)
    | null
  )[];
};

export type FetchInventoryItemResponse = {
  inventoryItem:
    | (gql.inventoryItems.InventoryItemFragment.Result & gql.inventoryItems.InventoryItemInventoryLevelFragment.Result)
    | null;
};
