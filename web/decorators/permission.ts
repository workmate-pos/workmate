import { decorator, DecoratorHandler } from '@teifi-digital/shopify-app-express/decorators/registry.js';
import { err } from '@teifi-digital/shopify-app-express/utils/express-utils.js';
import { RequestHandler } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { IGetManyResult, PermissionNode } from '../services/db/queries/generated/employee.sql.js';
import { db } from '../services/db/db.js';
import { gql } from '../services/gql/gql.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express-serve-static-core';
import { HttpError } from '@teifi-digital/shopify-app-express/errors/http-error.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { hasReadUsersScope } from '../services/shop.js';

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

    const associatedUser = await getAssociatedUser(_req, res);
    if (!associatedUser) {
      return err(res, 'You must be a staff member to access this resource', 401);
    }

    const employeeId = associatedUser.id;
    let [employee] = await db.employee.getMany({ shop: session.shop, employeeIds: [employeeId] });

    if (!employee) {
      const [{ exists: doEmployeesExist } = never('cannot be empty')] = await db.employee.doEmployeesExist({
        shop: session.shop,
      });
      const superuser = associatedUser.isShopOwner || !doEmployeesExist;

      [employee = never()] = await db.employee.upsertMany({
        shop: session.shop,
        employees: [
          {
            employeeId,
            permissions: [],
            rate: null,
            name: associatedUser.name,
            isShopOwner: associatedUser.isShopOwner,
            superuser,
          },
        ],
      });
    }

    const user: LocalsTeifiUser = {
      user: employee,
      staffMember: associatedUser,
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

async function getAssociatedUser(req: Request, res: Response): Promise<gql.staffMember.StaffMemberFragment.Result> {
  const session: Session = res.locals.shopify.session;

  // this works for all requests coming from admin
  if (session?.onlineAccessInfo?.associated_user) {
    return associatedUserToStaffInfo(session.onlineAccessInfo.associated_user);
  }

  // POS does not send associated_user, but will send the staff member's id in the session token
  const staffMemberId = getBearerStaffMemberId(req.headers.authorization);

  const [employee] = await db.employee.getMany({ shop: session.shop, employeeIds: [staffMemberId] });

  if (employee) {
    return {
      id: staffMemberId,
      name: employee.name,
      isShopOwner: employee.isShopOwner,
    };
  }

  // if this is a completely new employee we should fetch their details here. will only happen the first time

  const graphql = new Graphql(session);

  if (!(await hasReadUsersScope(graphql))) {
    // only happens for low shopify plans
    throw new HttpError('Staff member not found - log in to WorkMate on Shopify Admin first.', 401);
  }

  const [staffMember] = await gql.staffMember.getMany
    .run(graphql, { ids: [staffMemberId] })
    .then(response => response.nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'StaffMember')));

  return staffMember ?? never('Staff Member must exist because the signed token contained its id');
}

function getBearerStaffMemberId(authorizationHeader?: string): ID {
  if (!authorizationHeader) {
    throw new HttpError('You must be a staff member to access this resource', 401);
  }

  const token = authorizationHeader.split(' ')[1] ?? never();
  const content = jwt.decode(token, { json: true });

  if (!content) {
    throw new HttpError('Invalid token', 401);
  }

  const { sub } = content;

  if (!sub) {
    throw new HttpError('Invalid token', 401);
  }

  return createGid('StaffMember', sub);
}

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
