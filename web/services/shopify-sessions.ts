import { TeifiSessionStorage } from '@teifi-digital/shopify-app-express/shopify.js';
import { ShopifySession } from '@prisma/client';
import { Session } from '@shopify/shopify-api';
import { db } from './db/db.js';

export class ShopifySessionStorage implements TeifiSessionStorage {
  deleteSession(id: string): Promise<boolean> {
    return this.deleteSessions([id]);
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    const deleted = await db.shopifySession.remove({ ids });
    return deleted.length === ids.length;
  }

  async fetchAllOfflineSessions(): Promise<Session[]> {
    const sessions = await db.shopifySession.get({ isOnline: false });
    return sessions.map(shopifySessionToSession);
  }

  async fetchOfflineSessionByShop(shop: string): Promise<Session | undefined> {
    const [session] = await db.shopifySession.get({ shop, isOnline: false, limit: 1 });

    if (!session) {
      return undefined;
    }

    return shopifySessionToSession(session);
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const sessions = await db.shopifySession.get({ shop });
    return sessions.map(shopifySessionToSession);
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const [session] = await db.shopifySession.get({ id, limit: 1 });

    if (!session) {
      return undefined;
    }

    return shopifySessionToSession(session);
  }

  async storeSession(session: Session): Promise<boolean> {
    const record = sessionToShopifySession(session);
    await db.shopifySession.upsert(record);
    return true;
  }
}

function shopifySessionToSession(session: ShopifySession): Session {
  return new Session({
    id: session.id,
    shop: session.shop,
    state: session.state,
    isOnline: session.isOnline,
    scope: session.scope ?? undefined,
    expires: session.expires ?? undefined,
    accessToken: session.accessToken ?? undefined,
    onlineAccessInfo: session.onlineAccessInfo ? JSON.parse(session.onlineAccessInfo) : undefined,
  });
}

function sessionToShopifySession(session: Session): ShopifySession {
  return {
    id: session.id,
    shop: session.shop,
    state: session.state,
    isOnline: session.isOnline,
    scope: session.scope ?? null,
    expires: session.expires ?? null,
    accessToken: session.accessToken ?? null,
    onlineAccessInfo: session.onlineAccessInfo ? JSON.stringify(session.onlineAccessInfo) : null,
  };
}
