import { db } from '../db/db.js';
import { ShopSettings } from './schema.js';

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

function deserialize(value: string): unknown {
  return JSON.parse(value);
}

export async function getShopSettings(shop: string): Promise<ShopSettings> {
  // TODO: Schema migration to store json blobs
  //  (this cannot be done now because we must first do an app migration to move to zod)
  const [{ value } = { value: '{}' }] = await db.settings.getSetting({ shop, key: 'settings' });
  return ShopSettings.parse(deserialize(value));
}

export async function updateSettings(shop: string, settings: ShopSettings) {
  await db.settings.upsertSetting({ shop, key: 'settings', value: serialize(settings) });
}
