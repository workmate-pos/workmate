import { db } from '../db/db.js';
import { parseShopSettings, ShopSettings } from './schema.js';
import { setStaffMemberDefaultRole } from '../staff-members/queries.js';

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

function deserialize(value: string): unknown {
  return JSON.parse(value);
}

export async function getShopSettings(shop: string): Promise<ShopSettings> {
  // TODO: Schema migration to store json blobs
  //  (this cannot be done now because we must first do an app migration to move to zod)
  const [{ value } = { value: undefined }] = await db.settings.getSetting({ shop, key: 'settings' });
  return parseShopSettings(value ? deserialize(value) : undefined);
}

export async function updateShopSettings(shop: string, settings: ShopSettings) {
  await db.settings.upsertSetting({ shop, key: 'settings', value: serialize(settings) });

  const defaultRole = Object.entries(settings.roles).find(([, role]) => role.isDefault)?.[0];

  if (defaultRole) {
    await setStaffMemberDefaultRole({
      shop,
      roles: Object.keys(settings.roles),
      defaultRole,
    });
  }
}
