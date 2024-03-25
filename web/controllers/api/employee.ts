import { Session } from '@shopify/shopify-api';
import {
  Authenticated,
  BodySchema,
  Get,
  Post,
  QuerySchema,
} from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { Request, Response } from 'express-serve-static-core';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../../services/gql/gql.js';
import { db } from '../../services/db/db.js';
import { getShopSettings } from '../../services/settings.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Permission, isPermissionNode, LocalsTeifiUser } from '../../decorators/permission.js';
import { indexBy } from '@teifi-digital/shopify-app-toolbox/array';
import { UpsertEmployees } from '../../schemas/generated/upsert-employees.js';
import { Ids } from '../../schemas/generated/ids.js';
import { IUpsertManyParams } from '../../services/db/queries/generated/employee.sql.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';
import { hasReadUsersScope } from '../../services/shop.js';
import { assertGid } from '@teifi-digital/shopify-app-toolbox/shopify';

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

    const graphql = new Graphql(session);

    let response: gql.staffMember.getPage.Result;

    if (!(await hasReadUsersScope(graphql))) {
      const employees = await db.employee.getPage({ shop: session.shop, query: paginationOptions.query });

      response = {
        shop: {
          staffMembers: {
            nodes: employees.map(e => {
              assertGid(e.employeeId);
              return { isShopOwner: e.isShopOwner, name: e.name, id: e.employeeId };
            }),
            pageInfo: {
              hasNextPage: false,
              endCursor: null,
            },
          },
        },
      };
    } else {
      response = await gql.staffMember.getPage.run(graphql, paginationOptions);
    }

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

    const graphql = new Graphql(session);

    let staffMembers: gql.staffMember.StaffMemberFragment.Result[];

    if (!(await hasReadUsersScope(graphql))) {
      staffMembers = await db.employee.getMany({ shop, employeeIds: ids }).then(e =>
        e.filter(isNonNullable).map(e => {
          assertGid(e.employeeId);
          return { id: e.employeeId, name: e.name, isShopOwner: e.isShopOwner };
        }),
      );
    } else {
      const { nodes } = await gql.staffMember.getMany.run(graphql, { ids });
      staffMembers = nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'StaffMember'));
    }

    const staffMembersWithDatabaseInfo = await attachDatabaseEmployees(shop, staffMembers);

    const staffMemberRecord = indexBy(staffMembersWithDatabaseInfo, e => e.id);

    return res.json({ employees: ids.map(id => staffMemberRecord[id] ?? null) });
  }

  @Post('/')
  @Permission('write_employees')
  @BodySchema('upsert-employees')
  async upsertEmployees(req: Request<unknown, unknown, UpsertEmployees>, res: Response<UpsertEmployeesResponse>) {
    const session: Session = res.locals.shopify.session;
    const { shop } = session;

    const employeeIds = req.body.employees.map(e => e.employeeId);

    const graphql = new Graphql(session);

    let staffMembers: gql.staffMember.StaffMemberFragment.Result[];

    if (!(await hasReadUsersScope(graphql))) {
      staffMembers = await db.employee.getMany({ shop, employeeIds: employeeIds }).then(e =>
        e.filter(isNonNullable).map(e => {
          assertGid(e.employeeId);
          return { id: e.employeeId, name: e.name, isShopOwner: e.isShopOwner };
        }),
      );
    } else {
      staffMembers = await gql.staffMember.getMany
        .run(graphql, { ids: employeeIds })
        .then(({ nodes }) => nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'StaffMember')));
    }

    const staffMemberById = indexBy(staffMembers, e => e.id);

    const employees: IUpsertManyParams['employees'] = req.body.employees.map(e => {
      const staffMember = staffMemberById[e.employeeId];

      if (!staffMember) {
        throw new HttpError('Not all employees were found', 400);
      }

      return {
        employeeId: e.employeeId,
        rate: e.rate,
        superuser: e.superuser,
        permissions: e.permissions.map(p => {
          if (isPermissionNode(p)) return p;
          throw new Error(`Invalid permission node: ${p}`);
        }),
        name: staffMember.name,
        isShopOwner: staffMember.isShopOwner,
      };
    });

    await db.employee.upsertMany({ shop, employees });

    return res.json({ success: true });
  }
}

async function attachDatabaseEmployees(shop: string, staffMembers: gql.staffMember.StaffMemberFragment.Result[]) {
  const staffMemberIds = staffMembers.filter(isNonNullable).map(e => e.id);
  const employees = await db.employee.getMany({ shop, employeeIds: staffMemberIds });
  const { defaultRate } = await getShopSettings(shop);

  const employeeRecord = indexBy(employees, e => e.employeeId);

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
