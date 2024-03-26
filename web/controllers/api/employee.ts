import { Session } from '@shopify/shopify-api';
import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { Request, Response } from 'express-serve-static-core';
import { gql } from '../../services/gql/gql.js';
import { db } from '../../services/db/db.js';
import { getShopSettings } from '../../services/settings.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Permission, isPermissionNode, LocalsTeifiUser } from '../../decorators/permission.js';
import { indexBy } from '@teifi-digital/shopify-app-toolbox/array';
import { UpsertEmployees } from '../../schemas/generated/upsert-employees.js';
import { Ids } from '../../schemas/generated/ids.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { unit } from '../../services/db/unit-of-work.js';
import { getStaffMembersByIds, getStaffMembersPage } from '../../services/staff-members.js';

@Authenticated()
export default class EmployeeController {
  @Get('/me')
  @Permission('none')
  async fetchMe(req: Request, res: Response<FetchMeResponse>) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    const { defaultRate } = await getShopSettings(session.shop);

    return res.json({
      employee: {
        ...user.staffMember,
        ...user.user,
        rate: (user.user.rate ?? defaultRate) as Money,
        isDefaultRate: user.user.rate === null || user.user.rate === undefined,
      },
    });
  }

  @Get('/')
  @QuerySchema('pagination-options')
  @Permission('read_employees')
  async fetchEmployees(
    req: Request<unknown, unknown, unknown, PaginationOptions>,
    res: Response<FetchEmployeesResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    const response = await getStaffMembersPage(session, paginationOptions);

    const employees = response.shop.staffMembers.nodes;
    const pageInfo = response.shop.staffMembers.pageInfo;

    return res.json({
      employees: await attachDatabaseEmployees(session.shop, employees),
      pageInfo,
    });
  }

  @Get('/by-ids')
  @QuerySchema('ids')
  @Permission('read_employees')
  async fetchEmployeesById(req: Request<unknown, unknown, unknown, Ids>, res: Response<FetchEmployeesByIdResponse>) {
    const session: Session = res.locals.shopify.session;
    const { shop } = session;
    const { ids } = req.query;

    const staffMembers = await getStaffMembersByIds(session, ids);

    const staffMembersWithDatabaseInfo = await attachDatabaseEmployees(shop, staffMembers.filter(isNonNullable));

    const staffMemberRecord = indexBy(staffMembersWithDatabaseInfo, e => e.id);

    return res.json({ employees: ids.map(id => staffMemberRecord[id] ?? null) });
  }

  @Post('/')
  @Permission('write_employees')
  @BodySchema('upsert-employees')
  async upsertEmployees(req: Request<unknown, unknown, UpsertEmployees>, res: Response<UpsertEmployeesResponse>) {
    const session: Session = res.locals.shopify.session;
    const { shop } = session;

    if (req.body.employees.length === 0) {
      return res.json({ success: true });
    }

    const employeeIds = req.body.employees.map(e => e.employeeId);

    const staffMembers = await getStaffMembersByIds(session, employeeIds);

    const staffMemberById = indexBy(staffMembers.filter(isNonNullable), e => e.id);

    await unit(async () => {
      for (const { employeeId, rate, superuser, permissions } of req.body.employees) {
        const staffMember = staffMemberById[employeeId];

        if (!staffMember) {
          throw new HttpError('Not all employees were found', 400);
        }

        await db.employee.upsert({
          name: staffMember.name,
          shop,
          permissions: permissions.map(p => {
            if (isPermissionNode(p)) return p;
            throw new Error(`Invalid permission node: ${p}`);
          }),
          isShopOwner: staffMember.isShopOwner,
          rate,
          superuser,
          staffMemberId: employeeId,
        });
      }
    });

    return res.json({ success: true });
  }
}

async function attachDatabaseEmployees(shop: string, staffMembers: gql.staffMember.StaffMemberFragment.Result[]) {
  if (staffMembers.length === 0) {
    return [];
  }

  const staffMemberIds = staffMembers.map(e => e.id);
  const employees = await db.employee.getMany({ employeeIds: staffMemberIds });
  const { defaultRate } = await getShopSettings(shop);

  const employeeRecord = indexBy(employees, e => e.staffMemberId);

  return staffMembers.map(staffMember => {
    const employee = staffMember && employeeRecord[staffMember.id];

    return {
      ...staffMember,
      ...employee,
      rate: (employee?.rate ?? defaultRate) as Money,
      isDefaultRate: employee?.rate === null || employee?.rate === undefined,
    };
  });
}

export type EmployeeWithDatabaseInfo = Awaited<ReturnType<typeof attachDatabaseEmployees>>[number];

export type FetchEmployeesResponse = {
  employees: EmployeeWithDatabaseInfo[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

export type FetchEmployeesByIdResponse = {
  employees: (EmployeeWithDatabaseInfo | null)[];
};

export type UpsertEmployeesResponse = {
  success: true;
};

export type FetchMeResponse = {
  employee: EmployeeWithDatabaseInfo;
};
