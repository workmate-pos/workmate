import { Session } from '@shopify/shopify-api';
import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { Request, Response } from 'express-serve-static-core';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../../services/gql/gql.js';
import { db } from '../../services/db/db.js';
import { Ids } from '../../schemas/generated/ids.js';
import { getShopSettings } from '../../services/settings.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

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

    const graphql = new Graphql(session);
    const response = await gql.staffMember.getPage.run(graphql, paginationOptions);

    const employees = response.shop.staffMembers.nodes;
    const pageInfo = response.shop.staffMembers.pageInfo;

    return res.json({
      employees: (await getEmployeesWithRate(session.shop, employees)).map(e => e ?? never()),
      pageInfo,
    });
  }

  @Get('/by-ids')
  @QuerySchema('ids')
  async fetchEmployeesById(req: Request<unknown, unknown, unknown, Ids>, res: Response<FetchEmployeesByIdResponse>) {
    const session: Session = res.locals.shopify.session;
    const { shop } = session;
    const { ids } = req.query;

    const graphql = new Graphql(session);
    const { nodes } = await gql.staffMember.getMany.run(graphql, { ids });

    const staffMembers = nodes.filter(
      (node): node is null | (gql.staffMember.StaffMemberFragment.Result & { __typename: 'StaffMember' }) =>
        node === null || node.__typename === 'StaffMember',
    );

    const employeesWithRates = (await getEmployeesWithRate(shop, staffMembers)).filter(isNonNullable);

    return res.json({ employees: employeesWithRates });
  }
}

async function getEmployeesWithRate(shop: string, employees: (gql.staffMember.StaffMemberFragment.Result | null)[]) {
  const rates = await db.employeeRate.getMany({ shop, employeeIds: employees.filter(isNonNullable).map(e => e.id) });
  const ratesRecord = Object.fromEntries(rates.map(r => [r.employeeId, BigDecimal.fromString(r.rate)]));
  const { defaultRate } = await getShopSettings(shop);

  return employees.map(e =>
    e
      ? {
          ...e,
          rate: ratesRecord[e.id]?.toMoney() ?? defaultRate,
          isDefaultRate: !ratesRecord[e.id],
        }
      : null,
  );
}

export type EmployeeWithRate = gql.staffMember.StaffMemberFragment.Result & { rate: Money; isDefaultRate: boolean };

export type FetchEmployeesResponse = {
  employees: EmployeeWithRate[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

export type FetchEmployeesByIdResponse = {
  employees: (EmployeeWithRate | null)[];
};
