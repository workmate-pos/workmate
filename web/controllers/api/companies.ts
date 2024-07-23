import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import type { Request, Response } from 'express-serve-static-core';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import { gql } from '../../services/gql/gql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { Ids } from '../../schemas/generated/ids.js';
import { Session } from '@shopify/shopify-api';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { ShopifyPlan } from '../../decorators/shopify-plan.js';

@Authenticated()
@ShopifyPlan(['SHOPIFY_PLUS', 'SHOPIFY_PLUS_PARTNER_SANDBOX'])
export default class CompaniesController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchCompanies(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchCompaniesResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const graphql = new Graphql(session);
    const response = await gql.companies.getPage.run(graphql, paginationOptions);

    const companies = response.companies.nodes;
    const pageInfo = response.companies.pageInfo;

    return res.json({ companies, pageInfo });
  }

  @Get('/by-ids')
  @QuerySchema('ids')
  async fetchCompaniesById(req: Request<unknown, unknown, unknown, Ids>, res: Response<FetchCompaniesByIdResponse>) {
    const session: Session = res.locals.shopify.session;
    const { ids } = req.query;

    const graphql = new Graphql(session);
    const { nodes } = await gql.companies.getMany.run(graphql, { ids });
    const companies = nodes.filter(
      (node): node is null | (gql.companies.getMany.Result['nodes'][number] & { __typename: 'Company' }) => {
        return node === null || node.__typename === 'Company';
      },
    );

    return res.json({ companies });
  }

  @Get('/:id')
  async fetchCompany(req: Request<{ id: ID }>, res: Response<FetchCompanyResponse>) {
    const session: Session = res.locals.shopify.session;
    const { id } = req.params;

    const graphql = new Graphql(session);
    const { company } = await gql.companies.get.run(graphql, { id });

    return res.json({ company });
  }

  @Get('/:id/locations')
  @QuerySchema('pagination-options')
  async fetchCompanyLocations(
    req: Request<{ id: string }, unknown, unknown, PaginationOptions>,
    res: Response<FetchCompanyLocationsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const id = createGid('Company', req.params.id);
    const paginationOptions = req.query;

    const graphql = new Graphql(session);
    const response = await gql.companies.getCompanyLocations.run(graphql, { id, ...paginationOptions });

    if (!response.company) {
      throw new HttpError('Company not found', 404);
    }

    const locations = response.company.locations.nodes;
    const pageInfo = response.company.locations.pageInfo;

    return res.json({ locations, pageInfo });
  }

  @Get('/location/:id')
  async fetchCompanyLocationById(
    req: Request<{ id: string }, unknown, unknown, PaginationOptions>,
    res: Response<FetchCompanyLocationResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const id = createGid('CompanyLocation', req.params.id);

    const graphql = new Graphql(session);
    const response = await gql.companies.getCompanyLocation.run(graphql, { id });
    const location = response.companyLocation;

    return res.json({ location });
  }
}

export type FetchCompaniesResponse = {
  companies: gql.companies.CompanyFragment.Result[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

export type FetchCompaniesByIdResponse = {
  companies: (gql.companies.CompanyFragment.Result | null)[];
};

export type FetchCompanyResponse = {
  company: gql.companies.CompanyFragment.Result | null;
};

export type FetchCompanyLocationsResponse = {
  locations: gql.companies.LocationFragment.Result[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

export type FetchCompanyLocationResponse = {
  location: gql.companies.LocationFragment.Result | null;
};
