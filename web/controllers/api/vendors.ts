import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import { PaginationOptionsWithoutQuery } from '../../schemas/generated/pagination-options-without-query.js';
import { gql } from '../../services/gql/gql.js';
import { Session } from '@shopify/shopify-api';
import type { Request, Response } from 'express-serve-static-core';
import { getVendors } from '../../services/vendors/get.js';
import { ID, createGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

@Authenticated()
export default class VendorsController {
  @Get('/')
  @QuerySchema('pagination-options-without-query')
  async fetchVendors(
    req: Request<unknown, unknown, unknown, PaginationOptionsWithoutQuery>,
    res: Response<FetchVendorsResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const { nodes: vendors, pageInfo } = await getVendors(session, paginationOptions);

    const vendorsWithCustomerId = vendors.map(vendor => ({
      ...vendor,
      // vendor id is in the CustomerSegmentMember namespace but has the same id as Customer (don't ask me why)
      customerId: createGid('Customer', parseGid(vendor.id).id),
    }));

    return res.json({ vendors: vendorsWithCustomerId, pageInfo });
  }
}

export type FetchVendorsResponse = {
  vendors: (gql.segments.CustomerSegmentMemberFragment.Result & { customerId: ID })[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};
