import { Session } from '@shopify/shopify-api';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { Request, Response } from 'express-serve-static-core';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../../services/gql/gql.js';

@Authenticated()
export default class EmployeeController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchEmployees(req: Request<unknown, unknown, unknown, PaginationOptions>, res: Response) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const graphql = new Graphql(session);
    const response = await gql.staffMember.getStaffMembers(graphql, paginationOptions);

    const employees = response.shop.staffMembers.nodes;
    const pageInfo = response.shop.staffMembers.pageInfo;

    return res.json({ employees, pageInfo });
  }
}
