import { Session } from '@shopify/shopify-api';
import { Authenticated, BodySchema, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import type { Request, Response } from 'express-serve-static-core';
import { gql } from '../../services/gql/gql.js';
import { getShopSettings } from '../../services/settings/settings.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Permission, LocalsTeifiUser } from '../../decorators/permission.js';
import { groupBy, indexBy, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { UpsertEmployees } from '../../schemas/generated/upsert-employees.js';
import { Ids } from '../../schemas/generated/ids.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getStaffMembersByIds, getStaffMembersPage } from '../../services/staff-members.js';
import { intercom, IntercomUser } from '../../services/intercom.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { assertMoneyOrNull } from '../../util/assertions.js';
import { getDefaultRoleUuid } from '../../services/permissions/permissions.js';
import {
  deleteStaffMemberLocations,
  getStaffMemberLocations,
  getStaffMembers,
  insertStaffMemberLocations,
  upsertStaffMembers,
} from '../../services/staff-members/queries.js';
import { unit } from '../../services/db/unit-of-work.js';
import { assertLocationsPermitted } from '../../services/franchises/assert-locations-permitted.js';
import { StaffMemberPaginationOptions } from '../../schemas/generated/staff-member-pagination-options.js';

@Authenticated()
export default class EmployeeController {
  @Get('/me')
  @Permission('none')
  async fetchMe(req: Request, res: Response<FetchMeResponse>) {
    const session: Session = res.locals.shopify.session;
    const user: LocalsTeifiUser = res.locals.teifi.user;

    const settings = await getShopSettings(session.shop);
    const [employee = never()] = await attachDatabaseEmployees(session.shop, [user.staffMember]);

    return res.json({
      employee: {
        ...employee,
        rate: user.user.rate ?? settings.workOrders.charges.defaultHourlyRate,
        intercomUser: intercom.getUser(session.shop, user.staffMember.id),
      },
    });
  }

  @Get('/')
  @QuerySchema('staff-member-pagination-options')
  @Permission('read_employees')
  async fetchEmployees(
    req: Request<unknown, unknown, unknown, StaffMemberPaginationOptions>,
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

    const staffMembers = await getStaffMembersByIds(session, unique(ids));

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
    const user: LocalsTeifiUser = res.locals.teifi.user;

    if (req.body.employees.length === 0) {
      return res.json({ success: true });
    }

    await assertLocationsPermitted({
      shop,
      locationIds: unique(req.body.employees.map(employee => employee.locationIds).flat()),
      staffMemberId: user.staffMember.id,
    });

    const employeeIds = req.body.employees.map(e => e.staffMemberId);
    const staffMembers = await getStaffMembersByIds(session, employeeIds);
    const staffMemberById = indexBy(staffMembers.filter(isNonNullable), e => e.id);

    return await unit(async () => {
      await upsertStaffMembers(
        session.shop,
        req.body.employees.map(({ staffMemberId, rate, superuser, role }) => {
          const staffMember = staffMemberById[staffMemberId];

          if (!staffMember) {
            throw new HttpError('Not all employees were found', 400);
          }

          return {
            isShopOwner: staffMember.isShopOwner,
            staffMemberId,
            name: staffMember.name,
            email: staffMember.email,
            superuser,
            shop,
            rate,
            role,
          };
        }),
      );

      await deleteStaffMemberLocations(req.body.employees.map(employee => employee.staffMemberId));
      await insertStaffMemberLocations(req.body.employees);

      return res.json({ success: true });
    });
  }
}

async function attachDatabaseEmployees(shop: string, staffMembers: gql.staffMember.StaffMemberFragment.Result[]) {
  if (staffMembers.length === 0) {
    return [];
  }

  const staffMemberIds = staffMembers.map(e => e.id);
  const [employees, defaultRole, employeeLocations] = await Promise.all([
    getStaffMembers(shop, staffMemberIds),
    getDefaultRoleUuid(shop),
    getStaffMemberLocations(staffMemberIds),
  ]);
  const knownEmployeeIds = new Set(employees.map(e => e.staffMemberId));

  employees.push(
    ...(await upsertStaffMembers(
      shop,
      staffMembers
        .filter(staffMember => !knownEmployeeIds.has(staffMember.id))
        .map(staffMember => ({
          staffMemberId: staffMember.id,
          name: staffMember.name,
          isShopOwner: staffMember.isShopOwner,
          superuser: staffMember.isShopOwner,
          email: staffMember.email,
          role: defaultRole,
          rate: null,
          locationIds: [],
        })),
    )),
  );

  const { workOrders, roles } = await getShopSettings(shop);
  const employeeRecord = indexBy(employees, e => e.staffMemberId);
  const employeeLocationsRecord = groupBy(employeeLocations, e => e.staffMemberId);

  return staffMembers.map(staffMember => {
    const employee = employeeRecord[staffMember.id] ?? never('just made it');

    assertMoneyOrNull(employee.rate);

    const rate = employee.rate ?? workOrders.charges.defaultHourlyRate;
    const isDefaultRate = rate === null;
    const permissions = roles[employee.role]?.permissions ?? [];

    return {
      ...staffMember,
      ...employee,
      rate,
      isDefaultRate,
      permissions,
      locationIds: employeeLocationsRecord[staffMember.id]?.map(location => location.locationId) ?? [],
    };
  });
}

export type EmployeeWithDatabaseInfo = Awaited<ReturnType<typeof attachDatabaseEmployees>>[number];
export type MeEmployee = EmployeeWithDatabaseInfo & {
  intercomUser: IntercomUser;
};

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
  employee: MeEmployee;
};
