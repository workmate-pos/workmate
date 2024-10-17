import { TeifiSessionStorage } from '@teifi-digital/shopify-app-express';
import { Session } from '@shopify/shopify-api';
import { db } from './db/db.js';
import { createGid, ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { IGetResult as ShopifySession } from './db/queries/generated/shopify-session.sql.js';
import { getStaffMembers } from './staff-members/queries.js';

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

    const parsedSessionId = parseSessionId(id);

    // always use an offline session
    // this ensures that you do not have to log into admin daily to use POS, and ensures that access scopes do not need to be updated per user
    if (parsedSessionId.type !== 'offline') {
      // we should NOT fall back in case this is the first time the user logs in.
      // otherwise the staff member will never be added to the database in case they have a store without read_users capabilities
      const staffMemberId = parsedSessionId.staffMemberId;
      const staffMembers = await getStaffMembers(parsedSessionId.shop, [staffMemberId]);

      if (staffMembers.length) {
        [session] = await db.shopifySession.get({
          id: createSessionId({ type: 'offline', shop: parsedSessionId.shop }),
          limit: 1,
        });
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
}

export function shopifySessionToSession(session: ShopifySession): Session {
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

type ParsedSessionId = { type: 'offline'; shop: string } | { type: 'online'; shop: string; staffMemberId: ID };

function parseSessionId(id: string): ParsedSessionId {
  if (id.startsWith('offline_')) {
    return {
      type: 'offline',
      shop: id.replace('offline_', ''),
    };
  }
  const [staffMemberId, ...shopParts] = id.split('_').toReversed();
  const shop = shopParts.join('_');
  if (staffMemberId === undefined || shopParts.length === 0 || shop.length === 0) {
    throw new Error('Invalid session id');
  }
  return {
    type: 'online',
    shop,
    staffMemberId: createGid('StaffMember', staffMemberId),
  };
}

function createSessionId(parsedSessionId: ParsedSessionId) {
  if (parsedSessionId.type === 'offline') {
    return `offline_${parsedSessionId.shop}`;
  }
  if (parsedSessionId.type === 'online') {
    return `${parsedSessionId.shop}_${parseGid(parsedSessionId.staffMemberId).id}`;
  }
  return parsedSessionId satisfies never;
}
