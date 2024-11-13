import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { gql } from '../gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { hasReadUsersScope } from '../shop.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { getDefaultRoleUuid } from '../permissions/permissions.js';
import { getStaffMembers, upsertStaffMembers } from './queries.js';

export async function ensureStaffMembersExist(session: Session, staffMemberIds: ID[]) {
  if (staffMemberIds.length === 0) {
    return;
  }

  const databaseStaffMembers = await getStaffMembers(session.shop, staffMemberIds);
  const existingStaffMemberIds = new Set(databaseStaffMembers.map(staffMember => staffMember.staffMemberId));
  const missingStaffMemberIds = staffMemberIds.filter(staffMemberId => !existingStaffMemberIds.has(staffMemberId));

  const graphql = new Graphql(session);
  if (missingStaffMemberIds.length > 0 && !(await hasReadUsersScope(graphql))) {
    throw new HttpError('StaffMember is not synced - log in to WorkMate on Shopify Admin first.', 401);
  }

  await syncStaffMembers(session, missingStaffMemberIds);
}

export async function syncStaffMembersIfExists(session: Session, staffMemberIds: ID[]) {
  if (staffMemberIds.length === 0) {
    return;
  }

  const databaseStaffMembers = await getStaffMembers(session.shop, staffMemberIds);
  const existingStaffMemberIds = databaseStaffMembers.map(staffMember => {
    const staffMemberId = staffMember.staffMemberId;
    assertGid(staffMemberId);
    return staffMemberId;
  });

  await syncStaffMembers(session, existingStaffMemberIds);
}

export async function syncStaffMembers(session: Session, staffMemberIds: ID[]) {
  if (staffMemberIds.length === 0) {
    return;
  }

  const graphql = new Graphql(session);
  const { nodes } = await gql.staffMember.getManyForDatabase.run(graphql, { ids: staffMemberIds });
  const staffMembers = nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'StaffMember'));

  const errors: unknown[] = [];

  await upsertGraphqlStaffMembers(session.shop, staffMembers).catch(e => errors.push(e));

  if (staffMembers.length !== staffMemberIds.length) {
    errors.push(new Error(`Some staffMembers were not found (${staffMembers.length}/${staffMemberIds.length})`));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to sync staffMembers');
  }
}

async function upsertGraphqlStaffMembers(
  shop: string,
  staffMembers: gql.staffMember.DatabaseStaffMemberFragment.Result[],
) {
  if (staffMembers.length === 0) {
    return;
  }

  const staffMemberIds = staffMembers.map(e => e.id);

  const [knownStaffMembers, defaultRole] = await Promise.all([
    getStaffMembers(shop, staffMemberIds),
    getDefaultRoleUuid(shop),
  ]);

  await Promise.all([
    upsertStaffMembers(
      shop,
      staffMembers
        .filter(staffMember => !(staffMember.id in knownStaffMembers))
        .map(staffMember => ({
          staffMemberId: staffMember.id,
          name: staffMember.name,
          isShopOwner: staffMember.isShopOwner,
          superuser: staffMember.isShopOwner,
          email: staffMember.email,
          role: defaultRole,
          rate: null,
          defaultLocationId: null,
        })),
    ),

    upsertStaffMembers(
      shop,
      knownStaffMembers.map(databaseStaffMember => {
        const {
          id: staffMemberId,
          isShopOwner,
          name,
          email,
        } = staffMembers.find(staffMember => staffMember.id === databaseStaffMember.staffMemberId) ?? never();

        const { rate, superuser, role, defaultLocationId } = databaseStaffMember;

        return {
          shop,
          staffMemberId,
          isShopOwner,
          name,
          rate,
          email,
          role,
          superuser: superuser || isShopOwner,
          defaultLocationId,
        };
      }),
    ),
  ]);
}
