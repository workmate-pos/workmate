import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { db } from '../db/db.js';
import { gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { hasReadUsersScope } from '../shop.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { createNewEmployees } from '../../decorators/permission.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

export async function ensureEmployeesExist(session: Session, employeeIds: ID[]) {
  if (employeeIds.length === 0) {
    return;
  }

  const databaseEmployees = await db.employee.getMany({ employeeIds });
  const existingEmployeeIds = new Set(databaseEmployees.map(employee => employee.staffMemberId));
  const missingEmployeeIds = employeeIds.filter(employeeId => !existingEmployeeIds.has(employeeId));

  const graphql = new Graphql(session);
  if (missingEmployeeIds.length > 0 && !(await hasReadUsersScope(graphql))) {
    throw new HttpError('Employee is not synced - log in to WorkMate on Shopify Admin first.', 401);
  }

  await syncEmployees(session, missingEmployeeIds);
}

export async function syncEmployeesIfExists(session: Session, employeeIds: ID[]) {
  if (employeeIds.length === 0) {
    return;
  }

  const databaseEmployees = await db.employee.getMany({ employeeIds });
  const existingEmployeeIds = databaseEmployees.map(employee => {
    const employeeId = employee.staffMemberId;
    assertGid(employeeId);
    return employeeId;
  });

  await syncEmployees(session, existingEmployeeIds);
}

export async function syncEmployees(session: Session, employeeIds: ID[]) {
  if (employeeIds.length === 0) {
    return;
  }

  const graphql = new Graphql(session);
  const { nodes } = await gql.staffMember.getManyForDatabase.run(graphql, { ids: employeeIds });
  const employees = nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'StaffMember'));

  const errors: unknown[] = [];

  await upsertEmployees(session.shop, employees).catch(e => errors.push(e));

  if (employees.length !== employeeIds.length) {
    errors.push(new Error(`Some employees were not found (${employees.length}/${employeeIds.length})`));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync employees');
  }
}

async function upsertEmployees(shop: string, employees: gql.staffMember.DatabaseStaffMemberFragment.Result[]) {
  if (employees.length === 0) {
    return;
  }

  const employeeIds = employees.map(e => e.id);
  const knownEmployees = await db.employee.getMany({ shop, employeeIds });

  await createNewEmployees(
    shop,
    employees
      .filter(employee => !(employee.id in knownEmployees))
      .map(employee => ({
        employeeId: employee.id,
        name: employee.name,
        isShopOwner: employee.isShopOwner,
        superuser: employee.isShopOwner,
        email: employee.email,
      })),
  );

  // TODO: Fix email
  await db.employee.upsertMany({
    employees: knownEmployees.map(databaseEmployee => {
      const {
        id: staffMemberId,
        isShopOwner,
        name,
        email,
      } = employees.find(employee => employee.id === databaseEmployee.staffMemberId) ?? never();

      const { permissions, rate, superuser } = databaseEmployee;

      return {
        shop,
        staffMemberId,
        isShopOwner,
        name,
        rate,
        email,
        permissions: permissions ?? [],
        superuser: superuser || isShopOwner,
      };
    }),
  });
}
