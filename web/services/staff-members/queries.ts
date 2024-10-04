import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql } from '../db/sql-tag.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { assertMoneyOrNull } from '../../util/assertions.js';

export type StaffMember = ReturnType<typeof mapStaffMember>;

export async function getStaffMembers(shop: string, staffMemberIds: ID[]) {
  const staffMembers = await sql<{
    staffMemberId: string;
    shop: string;
    superuser: boolean;
    permissions: unknown[] | null;
    rate: string | null;
    isShopOwner: boolean;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    role: string;
  }>`
    SELECT *
    FROM "Employee"
    WHERE shop = ${shop}
      AND "staffMemberId" = ANY (${staffMemberIds as string[]})
  `;

  return staffMembers.map(mapStaffMember);
}

export function mapStaffMember(staffMember: {
  staffMemberId: string;
  shop: string;
  superuser: boolean;
  rate: string | null;
  isShopOwner: boolean;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  role: string;
}) {
  const { staffMemberId, rate } = staffMember;

  try {
    assertGid(staffMemberId);
    assertMoneyOrNull(rate);

    return {
      ...staffMember,
      rate,
      staffMemberId,
    };
  } catch (error) {
    sentryErr(error, { staffMember });
    throw new HttpError('Unable to parse staff member', 500);
  }
}

export async function getStaffMembersPage(shop: string, { query }: { query?: string }) {
  const staffMembers = await sql<{
    staffMemberId: string;
    shop: string;
    superuser: boolean;
    permissions: unknown[] | null;
    rate: string | null;
    isShopOwner: boolean;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    role: string;
  }>`
    SELECT *
    FROM "Employee"
    WHERE shop = ${shop}
      AND name ILIKE COALESCE(${query ?? null}, '%');
  `;

  return staffMembers.map(mapStaffMember);
}

export async function upsertStaffMembers(
  shop: string,
  staffMembers: {
    superuser: boolean;
    rate: Money | null;
    name: string;
    isShopOwner: boolean;
    staffMemberId: ID;
    email: string;
    role: string;
  }[],
) {
  if (!isNonEmptyArray(staffMembers)) {
    return [];
  }

  const { superuser, rate, name, isShopOwner, staffMemberId, email, role } = nest(staffMembers);

  const newStaffMembers = await sql<{
    staffMemberId: string;
    shop: string;
    superuser: boolean;
    permissions: any[];
    rate: string | null;
    isShopOwner: boolean;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    role: string;
  }>`
    INSERT INTO "Employee" (shop, superuser, rate, name, "isShopOwner", "staffMemberId", email, role, permissions)
    SELECT ${shop}, *, NULL
    FROM UNNEST(
      ${superuser} :: boolean[],
      ${rate as string[]} :: text[],
      ${name} :: text[],
      ${isShopOwner} :: boolean[],
      ${staffMemberId as string[]} :: text[],
      ${email} :: text[],
      ${role} :: text[]
         )
    ON CONFLICT ("staffMemberId")
      DO UPDATE SET shop          = EXCLUDED."shop",
                    superuser     = EXCLUDED.superuser,
                    rate          = EXCLUDED.rate,
                    name          = EXCLUDED.name,
                    "isShopOwner" = EXCLUDED."isShopOwner",
                    email         = EXCLUDED.email,
                    role          = EXCLUDED.role
    RETURNING *;
  `;

  return newStaffMembers.map(mapStaffMember);
}

export async function deleteStaffMembers(shop: string, staffMemberIds: ID[]) {
  await sql`
    DELETE
    FROM "Employee"
    WHERE shop = ${shop}
      AND "staffMemberId" = ANY (${staffMemberIds as string[]})
  `;
}

export async function getSuperusers(shop: string) {
  const staffMembers = await sql<{
    staffMemberId: string;
    shop: string;
    superuser: boolean;
    permissions: unknown[] | null;
    rate: string | null;
    isShopOwner: boolean;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    role: string;
  }>`
    SELECT *
    FROM "Employee"
    WHERE shop = ${shop}
      AND superuser = TRUE
  `;

  return staffMembers.map(mapStaffMember);
}

/**
 * Set a default role for staff members that do not have a known role.
 */
export async function setStaffMemberDefaultRole({
  shop,
  roles,
  defaultRole,
}: {
  shop: string;
  roles: string[];
  defaultRole: string;
}) {
  await sql`
    UPDATE "Employee"
    SET role = ${defaultRole}
    WHERE shop = ${shop}
      AND role != ALL (${roles})
  `;
}
