export function parseGid(gid: string) {
  const prefix = 'gid://shopify/';

  if (!gid.startsWith(prefix)) {
    throw new Error(`GID must start with ${prefix}`);
  }

  const [objectName, id] = gid.slice(prefix.length).split('/');

  if (!objectName || !id) {
    throw new Error(`GID must be in format ${prefix}objectName/id`);
  }

  return { objectName, id };
}

export function createGid(objectName: string, id: string) {
  return `gid://shopify/${objectName}/${id}`;
}
