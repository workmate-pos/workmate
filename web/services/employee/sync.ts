import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { db } from '../db/db.js';
import { gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { unit } from '../db/unit-of-work.js';

export async function ensureEmployeesExist(session: Session, employeeIds: ID[]) {
  if (employeeIds.length === 0) {
    return;
  }

  const databaseEmployees = await db.employee.getMany({ employeeIds });
  const existingEmployeeIds = new Set(databaseEmployees.map(employee => employee.staffMemberId));
  const missingEmployeeIds = employeeIds.filter(employeeId => !existingEmployeeIds.has(employeeId));

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

export async function upsertEmployees(shop: string, employees: gql.staffMember.DatabaseStaffMemberFragment.Result[]) {
  if (employees.length === 0) {
    return;
  }

  await unit(async () => {
    for (const { id: staffMemberId, name, isShopOwner } of employees) {
      await db.employee.upsert({
        shop,
        name,
        staffMemberId,
        rate: null,
        isShopOwner,
        permissions: [],
        superuser: isShopOwner,
      });
    }
  });
}