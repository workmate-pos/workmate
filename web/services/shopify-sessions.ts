import { TeifiSessionStorage } from '@teifi-digital/shopify-app-express/shopify.js';
import { ShopifySession } from '@prisma/client';
import { Session } from '@shopify/shopify-api';
import { db } from './db/db.js';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';

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
    let [session] = await db.shopifySession.get({ id, limit: 1 });

    if (session?.expires && session.expires < new Date()) {
      await db.shopifySession.remove({ ids: [id] });
      session = undefined;
    }

    // fall back to an offline session if the online session is not found
    // unfortunately required since POS does not do oauth, so not having this would require POS employees to log into admin for oauth
    if (!session && !this.isOfflineSessionId(id)) {
      // we should NOT fall back in case this is the first time the user logs in.
      // otherwise the staff member will never be added to the database in case they have a store without read_users capabilities
      const staffMemberId = this.getOnlineSessionIdStaffMemberId(id);
      const staffMembers = await db.employee.getMany({ employeeIds: [staffMemberId] });

      if (staffMembers.length) {
        [session] = await db.shopifySession.get({ id: this.onlineSessionIdToOfflineSessionId(id), limit: 1 });
      }
    }

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

  private isOfflineSessionId(id: string): boolean {
    return id.startsWith('offline_');
  }

  private onlineSessionIdToOfflineSessionId(id: string): string {
    return 'offline_' + id.replace(/_.+/, '');
  }

  private getOnlineSessionIdStaffMemberId(sessionId: string): ID {
    if (this.isOfflineSessionId(sessionId)) {
      throw new Error('Cannot get staff member id for offline session');
    }

    const id = sessionId.split('_').at(-1);

    if (!id) {
      throw new Error('Invalid session id');
    }

    return createGid('StaffMember', id);
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
