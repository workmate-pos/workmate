import pg from 'pg';
import { db } from './db.js';

export async function registerEnumTypes() {
  const enums = await db.types.getEnums();
  for (const { typeName, arrayTypeOid } of enums) {
    if (arrayTypeOid == null) continue;

    console.log(`Registering enum type ${typeName}[]`);
    pg.types.setTypeParser(arrayTypeOid, value => {
      if (value === 'null') return null;
      if (value === '{}') return [];
      return value.slice(1, -1).split(',');
    });
  }
}
