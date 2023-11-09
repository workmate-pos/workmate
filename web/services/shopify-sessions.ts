import { TeifiSessionStorage } from '@teifi-digital/shopify-app-express/shopify.js';
import { prisma } from './prisma.js';
import { ShopifySession } from '@prisma/client';
import { Session } from '@shopify/shopify-api';

export class ShopifySessionStorage implements TeifiSessionStorage {
  deleteSession(id: string): Promise<boolean> {
    return this.deleteSessions([id]);
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    const { count } = await prisma.shopifySession.deleteMany({
      where: { id: { in: ids } },
    });

    return count === ids.length;
  }

  async fetchAllOfflineSessions(): Promise<Session[]> {
    const sessions = await prisma.shopifySession.findMany({
      where: { isOnline: false },
    });

    return sessions.map(shopifySessionToSession);
  }

  async fetchOfflineSessionByShop(shop: string): Promise<Session | undefined> {
    const session = await prisma.shopifySession.findFirst({
      where: { shop, isOnline: false },
    });

    if (!session) {
      return undefined;
    }

    return shopifySessionToSession(session);
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const sessions = await prisma.shopifySession.findMany({
      where: { shop },
    });

    return sessions.map(shopifySessionToSession);
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const session = await prisma.shopifySession.findUnique({ where: { id } });

    if (!session) {
      return undefined;
    }

    return shopifySessionToSession(session);
  }

  async storeSession(session: Session): Promise<boolean> {
    const record = sessionToShopifySession(session);

    await prisma.shopifySession.upsert({
      where: { id: session.id },
      update: record,
      create: record,
    });

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
