import { decorator, DecoratorHandler } from '@teifi-digital/shopify-app-express/decorators/registry.js';
import { err } from '@teifi-digital/shopify-app-express/utils/express-utils.js';
import { RequestHandler } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { IGetManyResult, PermissionNode } from '../services/db/queries/generated/employee.sql.js';
import { db } from '../services/db/db.js';
import { gql } from '../services/gql/gql.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

export const permissionNodes = [
  'read_settings',
  'write_settings',
  'read_employees',
  'write_employees',
  'read_work_orders',
  'write_work_orders',
  'read_app_plan',
  'write_app_plan',
  'read_purchase_orders',
  'write_purchase_orders',
] as const satisfies readonly PermissionNode[];

export function isPermissionNode(node: string): node is PermissionNode {
  for (const n of permissionNodes) {
    if (n === node) return true;
  }
  return false;
}

export const PermissionKey = 'permission';
export function Permission(node: PermissionNode | 'superuser' | 'none') {
  return decorator(PermissionKey, node);
}

export const permissionHandler: DecoratorHandler<PermissionNode> = nodes => {
  return (async (_req, res, next) => {
    const session: Session = res.locals.shopify.session;

    const associatedUser = session?.onlineAccessInfo?.associated_user;
    if (!associatedUser) return err(res, 'You must be a staff member to access this resource', 401);

    const employeeId = createGid('StaffMember', String(associatedUser.id));
    let [employee] = await db.employee.getMany({ shop: session.shop, employeeIds: [employeeId] });

    if (!employee) {
      [employee = never()] = await db.employee.upsertMany({
        shop: session.shop,
        employees: [{ employeeId, permissions: [], rate: null, superuser: false }],
      });
    }

    const user: LocalsTeifiUser = {
      user: employee,
      staffMember: associatedUserToStaffInfo(associatedUser),
    };

    res.locals.teifi ??= {};
    res.locals.teifi.user = user;

    for (const node of nodes) {
      if (!hasPermission(user, node)) {
        return err(res, `You do not have permission to access this resource`, 401);
      }
    }
    next();
  }) as RequestHandler;
};

export type LocalsTeifiUser = {
  user: IGetManyResult;
  staffMember: gql.staffMember.StaffMemberFragment.Result;
};

export function hasPermission(user: LocalsTeifiUser, node: PermissionNode | 'none'): boolean {
  if (node === 'none') return true;
  if (user.user.superuser) return true;
  return user.user.permissions?.includes(node) ?? false;
}

function associatedUserToStaffInfo(
  associatedUser: NonNullable<Session['onlineAccessInfo']>['associated_user'],
): gql.staffMember.StaffMemberFragment.Result {
  return {
    id: createGid('StaffMember', String(associatedUser.id)),
    name: `${associatedUser.first_name} ${associatedUser.last_name}`,
    isShopOwner: associatedUser.account_owner,
  };
}
