import { sql as sqlTag } from '@ts-safeql/sql-tag';
import type { QueryResultRow } from 'pg';
import { useClient } from './client.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';

/**
 * SQL Tagged template that automatically binds values and runs it.
 */
export async function sql<T extends QueryResultRow = never>(strings: TemplateStringsArray, ...values: unknown[]) {
  using client = await useClient();
  const query = sqlTag(strings, ...values);
  const { rows } = await client.query<T>(query);
  return rows;
}

export async function sqlOne<T extends QueryResultRow = never>(strings: TemplateStringsArray, ...values: unknown[]) {
  const rows = await sql<T>(strings, ...values);

  if (rows.length !== 1) {
    throw new Error(`Expected 1 row, received ${rows.length}`);
  }

  return rows[0] ?? never();
}
