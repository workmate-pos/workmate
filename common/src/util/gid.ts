import { ID, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

export function isGidWithNamespace(namespace: string) {
  return (id: string | null | undefined): id is ID => {
    return !!id && parseGid(id).objectName === namespace;
  };
}
