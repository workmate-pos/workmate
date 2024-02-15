import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { Session } from '@shopify/shopify-api';
import { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../../services/gql/gql.js';
import type { Request, Response } from 'express-serve-static-core';
import { Ids } from '../../schemas/generated/ids.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

@Authenticated()
export default class LocationsController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchLocations(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchLocationsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const graphql = new Graphql(session);
    const response = await gql.location.getPage.run(graphql, paginationOptions);

    const locations = response.locations.nodes;
    const pageInfo = response.locations.pageInfo;

    return res.json({ locations, pageInfo });
  }

  @Get('/by-ids')
  @QuerySchema('ids')
  async fetchLocationsByIds(req: Request<unknown, unknown, unknown, Ids>, res: Response<FetchLocationsByIdResponse>) {
    const session: Session = res.locals.shopify.session;
    const { ids } = req.query;

    const graphql = new Graphql(session);
    const { nodes } = await gql.location.getMany.run(graphql, { ids });

    const locations = nodes.filter(
      (node): node is null | (gql.location.getMany.Result['nodes'][number] & { __typename: 'Location' }) =>
        node === null || node.__typename === 'Customer',
    );

    return res.json({ locations });
  }

  @Get('/id/:id')
  async fetchLocation(req: Request<{ id: ID }>, res: Response<FetchLocationResponse>) {
    const session: Session = res.locals.shopify.session;
    const { id } = req.params;

    const graphql = new Graphql(session);
    const { location } = await gql.location.get.run(graphql, { id });

    return res.json({ location });
  }
}

export type FetchLocationsResponse = {
  locations: gql.location.getPage.Result['locations']['nodes'];
  pageInfo: gql.location.getPage.Result['locations']['pageInfo'];
};

export type FetchLocationsByIdResponse = {
  locations: (gql.location.LocationFragment.Result | null)[];
};

export type FetchLocationResponse = {
  location: gql.location.LocationFragment.Result | null;
};
