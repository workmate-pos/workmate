import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { sql } from '../db/sql-tag.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { isNonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { nest } from '../../util/db.js';
import { assertGidOrNull, assertMoneyOrNull } from '../../util/assertions.js';

export type StaffMember = ReturnType<typeof mapStaffMember>;
export type StaffMemberLocation = ReturnType<typeof mapStaffMemberLocation>;

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
    defaultLocationId: string | null;
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
  defaultLocationId: string | null;
}) {
  const { staffMemberId, rate, defaultLocationId } = staffMember;

  try {
    assertGid(staffMemberId);
    assertMoneyOrNull(rate);
    assertGidOrNull(defaultLocationId);

    return {
      ...staffMember,
      rate,
      staffMemberId,
      defaultLocationId,
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
    defaultLocationId: string | null;
  }>`
    SELECT *
    FROM "Employee"
    WHERE shop = ${shop}
      AND (
      name ILIKE COALESCE(${query ?? null}, '%')
        OR email ILIKE COALESCE(${query ?? null}, '%')
      );
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
    defaultLocationId: ID | null;
  }[],
) {
  if (!isNonEmptyArray(staffMembers)) {
    return [];
  }

  const { superuser, rate, name, isShopOwner, staffMemberId, email, role, defaultLocationId } = nest(staffMembers);

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
    defaultLocationId: string | null;
  }>`
      INSERT INTO "Employee" (shop, superuser, rate, name, "isShopOwner", "staffMemberId", email, role, defaultLocationId, permissions)
      SELECT ${shop}, *, NULL
      FROM UNNEST(
              ${superuser} :: boolean[],
              ${rate as string[]} :: text[],
              ${name} :: text[],
              ${isShopOwner} :: boolean[],
              ${staffMemberId as string[]} :: text[],
              ${email} :: text[],
              ${role} :: text[],
              ${defaultLocationId as string[]} :: text[]
           )
      ON CONFLICT ("staffMemberId")
          DO UPDATE SET shop          = EXCLUDED."shop",
                        superuser     = EXCLUDED.superuser,
                        rate          = EXCLUDED.rate,
                        name          = EXCLUDED.name,
                        "isShopOwner" = EXCLUDED."isShopOwner",
                        email         = EXCLUDED.email,
                        role          = EXCLUDED.role,
                        defaultLocationId = EXCLUDED.defaultLocationId
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
    defaultLocationId: string | null;
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

export async function deleteStaffMemberLocations(staffMemberIds: ID[]) {
  if (!staffMemberIds.length) {
    return;
  }

  await sql`
    DELETE
    FROM "EmployeeLocation"
    WHERE "staffMemberId" = ANY (${staffMemberIds as string[]});
  `;
}

export async function insertStaffMemberLocations(staffMemberLocations: { staffMemberId: ID; locationIds: ID[] }[]) {
  const flatStaffMemberLocations = staffMemberLocations.flatMap(({ staffMemberId, locationIds }) =>
    locationIds.map(locationId => ({ staffMemberId, locationId })),
  );

  if (!isNonEmptyArray(flatStaffMemberLocations)) {
    return;
  }

  const { staffMemberId, locationId } = nest(flatStaffMemberLocations);

  await sql`
    INSERT INTO "EmployeeLocation" ("staffMemberId", "locationId")
    SELECT *
    FROM UNNEST(
      ${staffMemberId as string[]} :: text[],
      ${locationId as string[]} :: text[][]
         );
  `;
}

export async function getStaffMemberLocations(staffMemberIds: ID[]) {
  if (!staffMemberIds.length) {
    return [];
  }

  const locations = await sql<{
    id: number;
    staffMemberId: string;
    locationId: string;
    createdAt: Date;
    updatedAt: Date;
  }>`
      SELECT *
      FROM "EmployeeLocation"
      WHERE "staffMemberId" = ANY (${staffMemberIds as string[]})
  `;

  return locations.map(mapStaffMemberLocation);
}

function mapStaffMemberLocation(staffMemberLocation: {
  id: number;
  staffMemberId: string;
  locationId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { staffMemberId, locationId } = staffMemberLocation;

  try {
    assertGid(staffMemberId);
    assertGid(locationId);

    return {
      ...staffMemberLocation,
      staffMemberId,
      locationId,
    };
  } catch (error) {
    sentryErr(error, { staffMemberLocation });
    throw new HttpError('Unable to parse staff member location', 500);
  }
}
