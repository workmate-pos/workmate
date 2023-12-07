import { Session } from '@shopify/shopify-api';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { Request, Response } from 'express-serve-static-core';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../../services/gql/gql.js';
import { StaffMemberFragmentResult } from '../../services/gql/queries/generated/queries.js';
import { db } from '../../services/db/db.js';

@Authenticated()
export default class EmployeeController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchEmployees(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchEmployeesResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;
    const { shop } = session;

    const graphql = new Graphql(session);
    const response = await gql.staffMember.getStaffMembers(graphql, paginationOptions);

    const employees = response.shop.staffMembers.nodes;
    const pageInfo = response.shop.staffMembers.pageInfo;

    const rates = await db.employeeRate.getMany({ shop, employeeIds: employees.map(e => e.id) });
    const ratesRecord = Object.fromEntries(rates.map(r => [r.employeeId, r.rate]));

    const employeesWithRates = employees.map(e => ({ ...e, rate: ratesRecord[e.id] ?? null }));

    return res.json({ employees: employeesWithRates, pageInfo });
  }
}

export type FetchEmployeesResponse = {
  employees: (StaffMemberFragmentResult & { rate: number | null })[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};
