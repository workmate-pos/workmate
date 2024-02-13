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

/**
 * Resolves a namespace, replacing $app if it exists. Supports both standalone `$app` and `$app:some-namespace`.
 * {@link https://shopify.dev/docs/apps/custom-data/ownership}
 */
export async function resolveNamespace(session: Session, namespace: string) {
  // $app:some-namespace maps to app--123456--some-namespace

  if (!namespace.startsWith('$app')) {
    return namespace;
  }

  const appNamespace = await getAppNamespace(session);

  if (namespace.startsWith('$app:')) {
    return `${appNamespace}--${namespace.slice('$app:'.length)}`;
  }

  return appNamespace;
}
