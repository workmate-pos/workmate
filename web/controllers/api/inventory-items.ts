import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../../services/gql/gql.js';
import { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { Request, Response } from 'express-serve-static-core';
import { Ids } from '../../schemas/generated/ids.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

@Authenticated()
export default class InventoryItemsController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchInventoryItems(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
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
  @QuerySchema('ids')
  async fetchInventoryItemsByIds(
    req: Request<unknown, unknown, unknown, Ids>,
    res: Response<FetchInventoryItemsByIdResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const { ids } = req.query;

    const graphql = new Graphql(session);
    const { nodes } = await gql.inventoryItems.getMany.run(graphql, { ids });

    const inventoryItems = nodes.filter(
      (node): node is null | (gql.inventoryItems.getMany.Result['nodes'][number] & { __typename: 'InventoryItem' }) =>
        node === null || node.__typename === 'InventoryItem',
    );

    return res.json({ inventoryItems });
  }

  @Get('/id/:id')
  async fetchInventoryItem(req: Request<{ id: ID }>, res: Response<FetchInventoryItemResponse>) {
    const session: Session = res.locals.shopify.session;
    const { id } = req.params;

    const graphql = new Graphql(session);
    const { inventoryItem } = await gql.inventoryItems.get.run(graphql, { id });

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
