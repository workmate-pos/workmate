type ID = string & { __brand: 'ID' };

export function parseGid(gid: ID) {
  const prefix = 'gid://shopify/';

  if (!gid.startsWith(prefix)) {
    throw new Error(`GID must start with ${prefix}`);
  }

  const [objectName, id] = gid.slice(prefix.length).split('/');

  if (!objectName || !id || Number.isNaN(Number(id))) {
    throw new Error(`GID must be in format ${prefix}objectName/id`);
  }

  return { objectName, id: Number(id) };
}

export function createGid(objectName: string, id: string): ID {
  return `gid://shopify/${objectName}/${id}` as ID;
}
