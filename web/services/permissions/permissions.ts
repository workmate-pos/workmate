import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getShopSettings } from '../settings/settings.js';
import { httpError } from '../../util/http-error.js';
import { getStaffMembers } from '../staff-members/queries.js';

export const permissions = [
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
  'cycle_count',
  'read_stock_transfers',
  'write_stock_transfers',
  'read_special_orders',
  'write_special_orders',
] as const;

export type Permission = (typeof permissions)[number];

export function isPermission(permission: string): permission is Permission {
  return (permissions as readonly string[]).includes(permission);
}

export async function getMissingPermissionsForRole(shop: string, role: string, permissions: Permission[]) {
  if (permissions.length === 0) {
    return [];
  }

  const { roles } = await getShopSettings(shop);
  const rolePermissions = roles[role]?.permissions ?? [];
  return permissions.filter(permission => !rolePermissions.includes(permission));
}

export async function getMissingPermissionsForStaffMember(shop: string, staffMemberId: ID, permissions: Permission[]) {
  if (permissions.length === 0) {
    return [];
  }

  const [staffMember] = await getStaffMembers(shop, [staffMemberId]);

  if (!staffMember) {
    return permissions;
  }

  return getMissingPermissionsForRole(shop, staffMember.role, permissions);
}

export async function getDefaultRole(shop: string) {
  const { roles } = await getShopSettings(shop);
  // All shops should have a default role. This is enforced by the settings schema so this should be impossible.
  return Object.entries(roles).find(([, role]) => role.isDefault)?.[0] ?? httpError('No default role set');
}
