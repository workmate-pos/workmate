import { Session } from '@shopify/shopify-api';
import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { gql } from '../gql/gql.js';

let appId: ID | null = null;

export async function getAppId(session: Session): Promise<ID> {
  if (appId) {
    return appId;
  }

  const graphql = new Graphql(session);
  const { currentAppInstallation } = await gql.app.getAppId.run(graphql, {});

  appId = currentAppInstallation.app.id;

  return appId;
}

export async function getAppNamespace(session: Session): Promise<string> {
  const appId = await getAppId(session);
  return `app--${parseGid(appId).id}`;
}

export async function resolveNamespace(session: Session, namespace: string) {
  if (namespace === '$app') {
    return getAppNamespace(session);
  }

  return namespace;
}
