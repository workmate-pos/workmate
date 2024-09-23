import { decorator, DecoratorHandler } from '@teifi-digital/shopify-app-express/decorators';
import { err } from '@teifi-digital/shopify-app-express/utils';
import { RequestHandler } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { IGetManyResult, PermissionNode } from '../services/db/queries/generated/employee.sql.js';
import { db } from '../services/db/db.js';
import { gql } from '../services/gql/gql.js';
import { assertGid, createGid, ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express-serve-static-core';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { hasReadUsersScope } from '../services/shop.js';
import { assertMoneyOrNull } from '../util/assertions.js';
import { IncomingHttpHeaders } from 'node:http';
import { getShopifyApp } from '@teifi-digital/shopify-app-express';
import { httpError } from '../util/http-error.js';

export const permissionNodes = [
  'cycle_count',
  'read_app_plan',
  'read_employees',
  'read_purchase_orders',
  'read_settings',
  'read_special_orders',
  'read_stock_transfers',
  'read_work_orders',
  'write_app_plan',
  'write_employees',
  'write_purchase_orders',
  'write_settings',
  'write_special_orders',
  'write_stock_transfers',
  'write_work_orders',
] as const satisfies readonly PermissionNode[];

// TODO: Configurable per store !!!
export const defaultPermissionNodes: PermissionNode[] = [
  'read_employees',
  'read_settings',
  'read_work_orders',
  'write_work_orders',
  'read_purchase_orders',
  'read_stock_transfers',
  'read_special_orders',
  'write_special_orders',
];

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

    let [{ exists: doesSuperuserExist } = never('cannot be empty')] = await db.employee.doesSuperuserExist({
      shop: session.shop,
    });

    if (!employee) {
      const superuser = associatedUser.isShopOwner || !doesSuperuserExist || associatedUser.email.endsWith('@teifi.ca');
      const { name, email, isShopOwner } = associatedUser;

      [employee = never('just made it')] = await createNewEmployees(session.shop, [
        { superuser, employeeId, name, email, isShopOwner },
      ]);

      doesSuperuserExist ||= superuser;
    }

    assertGid(employee.staffMemberId);
    assertMoneyOrNull(employee.rate);

    if (!doesSuperuserExist) {
      [employee = never('just made it')] = await db.employee.upsert({
        shop: session.shop,
        staffMemberId: employee.staffMemberId,
        permissions: employee.permissions ?? [],
        isShopOwner: employee.isShopOwner,
        name: employee.name,
        rate: employee.rate,
        superuser: true,
        email: employee.email,
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
  const graphql = new Graphql(session);

  const [canReadStaffMembers, staffMemberId] = await Promise.all([
    hasReadUsersScope(graphql),
    getRequestStaffMemberId(req.headers),
  ]);

  // this works for all requests coming from admin
  if (
    session?.onlineAccessInfo?.associated_user &&
    session.onlineAccessInfo.associated_user.id.toString() === parseGid(staffMemberId).id
  ) {
    return associatedUserToStaffInfo(session.onlineAccessInfo.associated_user);
  }

  const [employee] = await db.employee.getMany({ shop: session.shop, employeeIds: [staffMemberId] });

  if (employee) {
    return {
      id: staffMemberId,
      name: employee.name,
      isShopOwner: employee.isShopOwner,
      email: employee.email,
    };
  }

  if (!canReadStaffMembers) {
    // logging in through admin will trigger the associated_user branch above
    throw new HttpError(
      'Staff member not found - log into WorkMate on Shopify Admin first to register the logged-in staff member.',
    );
  }

  const [staffMember] = await gql.staffMember.getMany
    .run(graphql, { ids: [staffMemberId] })
    .then(response => response.nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'StaffMember')));

  if (!staffMember) {
    console.log(`Could not find staff member ${staffMemberId}`);
    throw new HttpError('Staff member not found. Try using a different account.');
  }

  return {
    id: staffMemberId,
    name: staffMember.name,
    isShopOwner: staffMember.isShopOwner,
    email: staffMember.email,
  };
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
    id: createGid('StaffMember', associatedUser.id),
    name: `${associatedUser.first_name} ${associatedUser.last_name}`,
    isShopOwner: associatedUser.account_owner,
    email: associatedUser.email_verified ? associatedUser.email : '',
  };
}

export async function createNewEmployees(
  shop: string,
  employees: {
    employeeId: ID;
    name: string;
    isShopOwner: boolean;
    superuser: boolean;
    email: string;
  }[],
) {
  if (!employees.length) return [];

  return await db.employee.upsertMany({
    employees: employees.map(({ employeeId: staffMemberId, name, isShopOwner, superuser, email }) => ({
      shop,
      staffMemberId,
      name,
      isShopOwner,
      superuser,
      email,
      permissions: defaultPermissionNodes,
      rate: null,
    })),
  });
}

/**
 * Extracts the staff member id from request headers.
 * The Authorization header contains a JWT with the staff member id as subject.
 * On POS the JWT does not necessarily contain the pinned-in staff member id, so we also send x-pos-staff-member-id to override the jwt subject
 * from pos.
 */
async function getRequestStaffMemberId(headers: IncomingHttpHeaders) {
  if (headers['x-pos-staff-member-id']) {
    const userId = headers['x-pos-staff-member-id'];

    if (!Array.isArray(userId) && /^\d+$/.test(userId)) {
      return createGid('StaffMember', userId);
    }

    sentryErr('Received invalid x-pos-staff-member-id', { userId });
  }

  return await getBearerStaffMemberId(headers.authorization);
}

async function getBearerStaffMemberId(authorizationHeader?: string) {
  if (!authorizationHeader) {
    throw new HttpError('You must be a staff member to access this resource', 401);
  }

  const token = authorizationHeader.split(' ')[1] ?? never('bad token');
  const content = await getShopifyApp().api.session.decodeSessionToken(token);

  if (!content) {
    throw new HttpError('Invalid token', 401);
  }

  const { sub } = content;

  if (!sub) {
    throw new HttpError('Invalid token', 401);
  }

  return createGid('StaffMember', sub);
}
