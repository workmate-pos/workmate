import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Session } from '@shopify/shopify-api';
import { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../../services/gql/gql.js';
import type { Request, Response } from 'express-serve-static-core';
import { Ids } from '../../schemas/generated/ids.js';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { LocalsTeifiUser, Permission } from '../../decorators/permission.js';

@Authenticated()
@Permission('none')
export default class LocationsController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchLocations(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchLocationsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    const query = [getAllowedLocationsQuery(user), paginationOptions.query]
      .filter(Boolean)
      .map(q => `(${q})`)
      .join(' AND ');

    const graphql = new Graphql(session);
    const response = await gql.location.getPage.run(graphql, { ...paginationOptions, query });

    const locations = response.locations.nodes;
    const pageInfo = response.locations.pageInfo;

    return res.json({ locations, pageInfo });
  }

  @Get('/by-ids')
  @QuerySchema('ids')
  async fetchLocationsByIds(req: Request<unknown, unknown, unknown, Ids>, res: Response<FetchLocationsByIdResponse>) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { ids } = req.query;

    const graphql = new Graphql(session);
    const { nodes } = await gql.location.getMany.run(graphql, {
      ids: ids.filter(id => user.user.allowedLocationIds?.includes(id) ?? true),
    });

    return res.json({
      locations: ids.map(
        id =>
          nodes.find(
            (node): node is NonNullable<typeof node> & { __typename: 'Location' } =>
              node?.__typename === 'Location' && node?.id === id,
          ) ?? null,
      ),
    });
  }

  @Get('/:id')
  async fetchLocation(req: Request<{ id: ID }>, res: Response<FetchLocationResponse>) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;
    const { id } = req.params;

    if (user.user.allowedLocationIds?.includes(id) === false) {
      return res.json({ location: null });
    }

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

function getAllowedLocationsQuery(user: LocalsTeifiUser) {
  if (!user.user.allowedLocationIds) {
    return null;
  }

  return user.user.allowedLocationIds.map(id => `id:${parseGid(id).id}`).join(' OR ') || 'NOT id:*';
}
