import { sql } from '../../sql-tag.js';
import { transaction } from '../../transaction.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { Permission } from '../../../permissions/permissions.js';
import { getShopSettings, updateShopSettings } from '../../../settings/settings.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { upsertStaffMembers } from '../../../staff-members/queries.js';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

/**
 * Moving away from the old permission to a role-based system, we must create roles for every permnission combination and assign employees these roles.
 * This migration also creates default roles as defined by the settings.
 */
export default async function migrate() {
  await transaction(async () => {
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
  `;

    const shops = unique(staffMembers.map(employee => employee.shop));

    for (const shop of shops) {
      const shopEmployees = staffMembers.filter(employee => employee.shop === shop);
      const rolePermissions = new Set<string>();

      for (const { permissions } of shopEmployees) {
        if (!permissions) {
          continue;
        }

        rolePermissions.add(permissions.toSorted().join(','));
      }

      const settings = await getShopSettings(shop);

      for (const { permissions } of Object.values(settings.roles)) {
        rolePermissions.delete(permissions.toSorted().join(','));
      }

      const roles = {
        ...settings.roles,
        ...Object.fromEntries(
          [...rolePermissions.values()]
            .map(permissions => permissions.split(',').filter(Boolean) as Permission[])
            .map((permissions, i) => [`Auto-generated role ${i + 1}`, { isDefault: false, permissions }]),
        ),
      };

      await updateShopSettings(shop, { ...settings, roles });

      await upsertStaffMembers(
        shop,
        shopEmployees.map(staffMember => {
          const role =
            Object.entries(roles).find(
              ([, { permissions }]) =>
                permissions.toSorted().join(',') === staffMember.permissions?.toSorted().join(','),
            )?.[0] ?? never();

          return {
            ...staffMember,
            staffMemberId: staffMember.staffMemberId as ID,
            rate: staffMember.rate as Money | null,
            role,
          };
        }),
      );
    }
  });
}
