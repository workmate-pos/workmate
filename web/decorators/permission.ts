import { decorator, DecoratorHandler } from '@teifi-digital/shopify-app-express/decorators';
import { err } from '@teifi-digital/shopify-app-express/utils';
import { RequestHandler } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { gql } from '../services/gql/gql.js';
import { createGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import type { Request, Response } from 'express-serve-static-core';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Graphql, sentryErr } from '@teifi-digital/shopify-app-express/services';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { hasReadUsersScope } from '../services/shop.js';
import { IncomingHttpHeaders } from 'node:http';
import { getShopifyApp } from '@teifi-digital/shopify-app-express';
import {
  getDefaultRole,
  getMissingPermissionsForRole,
  isPermission,
  Permission,
} from '../services/permissions/permissions.js';
import { getStaffMembers, getSuperusers, StaffMember, upsertStaffMembers } from '../services/staff-members/queries.js';

export const PermissionKey = 'permission';
export function Permission(permission: Permission | 'superuser' | 'none') {
  return decorator(PermissionKey, permission);
}

export const permissionHandler: DecoratorHandler<Permission | 'superuser' | 'none'> = permissions => {
  return (async (_req, res, next) => {
    const session: Session = res.locals.shopify.session;

    const associatedUser = await getAssociatedUser(_req, res);

    if (!associatedUser) {
      return err(res, 'You must be a staff member to access this resource', 401);
    }

    const staffMemberId = associatedUser.id;

    let [[staffMember], doesSuperuserExist, defaultRole] = await Promise.all([
      getStaffMembers(session.shop, [staffMemberId]),
      getSuperusers(session.shop).then(superusers => superusers.length > 0),
      getDefaultRole(session.shop),
    ]);

    if (!staffMember || !doesSuperuserExist) {
      const superuser = associatedUser.isShopOwner || !doesSuperuserExist || associatedUser.email.endsWith('@teifi.ca');
      const { name, email, isShopOwner } = associatedUser;

      [staffMember = never()] = await upsertStaffMembers(session.shop, [
        {
          superuser,
          staffMemberId,
          name,
          isShopOwner,
          email,
          role: staffMember?.role ?? defaultRole,
          rate: staffMember?.rate ?? null,
        },
      ]);
    }

    const user: LocalsTeifiUser = {
      user: staffMember,
      staffMember: associatedUser,
    };

    res.locals.teifi ??= {};
    res.locals.teifi.user = user;

    if (permissions.includes('superuser') && !staffMember.superuser) {
      return err(res, 'You must be a superuser to access this resource', 401);
    }

    const missingPermissions = await getMissingPermissionsForRole(
      session.shop,
      staffMember.role,
      permissions.filter(isPermission),
    );

    if (missingPermissions.length > 0) {
      return err(res, `You do not have permission to access this resource`, 401);
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

  const [staffMember] = await getStaffMembers(session.shop, [staffMemberId]);

  if (staffMember) {
    return {
      id: staffMemberId,
      name: staffMember.name,
      isShopOwner: staffMember.isShopOwner,
      email: staffMember.email,
    };
  }

  if (!canReadStaffMembers) {
    // logging in through admin will trigger the associated_user branch above
    throw new HttpError(
      'Staff member not found - log into WorkMate on Shopify Admin first to register the logged-in staff member.',
    );
  }

  const [gqlStaffMember] = await gql.staffMember.getMany
    .run(graphql, { ids: [staffMemberId] })
    .then(response => response.nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'StaffMember')));

  if (!gqlStaffMember) {
    console.log(`Could not find staff member ${staffMemberId}`);
    throw new HttpError('Staff member not found. Try using a different account.');
  }

  return {
    id: gqlStaffMember.id,
    name: gqlStaffMember.name,
    isShopOwner: gqlStaffMember.isShopOwner,
    email: gqlStaffMember.email,
  };
}

export type LocalsTeifiUser = {
  user: StaffMember;
  staffMember: gql.staffMember.StaffMemberFragment.Result;
};

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
