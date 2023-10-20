import PG from 'pg';
import format from 'pg-format';
import { named } from '@teifi-digital/shopify-app-express/utils/query-utils.js';
import { camelCase, camelCaseObj } from '@teifi-digital/shopify-app-express/utils/string-utils.js';
import { SessionStorage } from '@shopify/shopify-app-session-storage';
import { Session } from '@shopify/shopify-api';

export const TableNames = {
  ShopifySessions: 'shopify_sessions',
} as const;

export const Tables = {
  ShopifySessions: {
    columnDefinitions: [
      ['id', 'text NOT NULL PRIMARY KEY'],
      ['shop', 'text NOT NULL'],
      ['state', 'text NOT NULL'],
      ['isOnline', 'boolean NOT NULL'],
      ['scope', 'text'],
      ['expires', 'integer'],
      ['onlineAccessInfo', 'text'],
      ['accessToken', 'text'],
    ],
    conflictKeys: ['id'],
  },
} as const;

const toArg = (_, i) => `$${i + 1}`;

export class PostgresDatabase implements SessionStorage {
  private readonly pool: PG.Pool;
  private readonly ready: Promise<void>;

  constructor() {
    this.pool = new PG.Pool({
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? '5432'),
      user: process.env.POSTGRES_USER ?? 'postgres',
      password: process.env.POSTGRES_PASSWORD ?? 'password',
      database: process.env.POSTGRES_DB ?? 'postgres',
    });
    this.ready = this.init();
  }

  public async storeSession(session: Session): Promise<boolean> {
    await this.ready;

    const entries = session.toPropertyArray().map(([k, v]) => {
      const lowerKey = k.toLowerCase();
      // Note milliseconds to seconds conversion for `expires` property
      return lowerKey === 'expires' ? [lowerKey, Math.floor((v as number) / 1000)] : [lowerKey, v];
    });
    return this.upsert('ShopifySessions', Object.fromEntries(entries), [], ['id']).then(() => true);
  }

  public async loadSession(id: string): Promise<Session | undefined> {
    if (id == null) return undefined;

    await this.ready;
    const { rows } = await this.pool.query(
      format(
        `
        SELECT * FROM %I
        WHERE id = $1;
      `,
        TableNames.ShopifySessions,
      ),
      [id],
    );
    if (!Array.isArray(rows) || rows?.length !== 1) return undefined;
    const rawResult = rows[0] as any;
    return this.databaseRowToSession(rawResult);
  }

  public async deleteSession(id: string): Promise<boolean> {
    await this.ready;
    await this.pool.query(
      format(
        `
          DELETE FROM %I
          WHERE id = $1;
        `,
        TableNames.ShopifySessions,
      ),
      [id],
    );
    return true;
  }

  public async deleteSessions(ids: string[]): Promise<boolean> {
    await this.ready;
    await this.pool.query(
      format(
        `
          DELETE FROM %I
          WHERE id IN (${ids.map(toArg).join(',')});
        `,
        TableNames.ShopifySessions,
      ),
      ids,
    );
    return true;
  }

  public async findSessionsByShop(shop: string): Promise<Session[]> {
    await this.ready;
    const { rows } = await this.pool.query(
      format(
        `
          SELECT * FROM %I
          WHERE shop = $1;
        `,
        TableNames.ShopifySessions,
      ),
      [shop],
    );
    if (!Array.isArray(rows) || rows?.length === 0) return [];

    return rows.map(row => this.databaseRowToSession(row));
  }

  private databaseRowToSession(row: any): Session {
    if (row == null) return null;
    // convert seconds to milliseconds prior to creating Session object
    if (row.expires) row.expires *= 1000;
    return Session.fromPropertyArray(Object.entries(row));
  }

  public async fetchAllOfflineSessions(): Promise<Session[]> {
    await this.ready;
    return await this.pool
      .query(`SELECT * FROM shopify_sessions WHERE isonline = false;`)
      .then(({ rows }) => rows.map(row => this.databaseRowToSession(row)));
  }

  public async fetchOfflineSessionByShop(shop: string): Promise<Session | null> {
    await this.ready;
    return await this.pool
      .query(`SELECT * FROM shopify_sessions WHERE isonline = false AND shop = $1;`, [shop])
      .then(({ rows }) => this.databaseRowToSession(rows?.[0]));
  }

  private getKeys<K extends keyof typeof TableNames>(
    tableKey: K,
    excluded: string[] = [],
    included: string[] = [],
  ): string[] {
    return Tables[tableKey].columnDefinitions
      .map(def => def[0] as string)
      .filter(
        k => included.includes(k) || (k !== 'id' && k !== 'created_at' && k !== 'updated_at' && !excluded.includes(k)),
      );
  }

  public async store<K extends keyof typeof TableNames, T>(
    tableKey: K,
    obj: T,
    excluded: string[] = [],
    included: string[] = [],
  ): Promise<T> {
    await this.ready;

    const keys = this.getKeys(tableKey, excluded, included);

    let sql;
    const emptyId = obj?.['id'] == null || obj?.['id']?.toString()?.trim() === '';
    if (emptyId) {
      sql = format(
        `
          INSERT INTO %I (%I)
          VALUES (%s)
          RETURNING *
        `,
        TableNames[tableKey],
        keys,
        keys.map(k => `:${camelCase(k)}`),
      );
    } else {
      sql = format(
        `
          UPDATE %I SET %s
          WHERE id = :id
          RETURNING *
        `,
        TableNames[tableKey],
        keys.map(k => `${k} = :${camelCase(k)}`),
      );
    }

    const storedObj = await this.pool.query(named(sql, obj)).then(res => camelCaseObj(res.rows[0]) as T);
    if (storedObj == null && !emptyId) {
      const objWithoutId = { ...obj };
      objWithoutId['id'] = null;
      return this.store(tableKey, objWithoutId, excluded, included);
    }
    return storedObj;
  }

  private async createTableIfNotExists(tableKey: keyof typeof TableNames): Promise<void> {
    const tableName = TableNames[tableKey];
    const table = Tables[tableKey];

    const extraDefinitions = 'extraDefinitions' in table ? `, ${(table as any).extraDefinitions.join(', ')}` : '';
    await this.pool.query(
      format(
        `
          CREATE TABLE IF NOT EXISTS %I (
            %s
            %s
          )
        `,
        tableName,
        table.columnDefinitions.map(def => def.join(' ')),
        extraDefinitions,
      ),
    );
    if (table.columnDefinitions.some(([col]: any) => col === 'updated_at')) {
      await this.createUpdatedAtTrigger(tableKey);
    }
  }

  private async createUpdatedAtTrigger(tableKey: keyof typeof TableNames): Promise<void> {
    const tableName = TableNames[tableKey];
    await this.pool.query(
      format(
        `
        CREATE OR REPLACE TRIGGER tg_%s_updated_at
          BEFORE UPDATE
          ON %I
          FOR EACH ROW
          EXECUTE PROCEDURE update_updated_at_column();
      `,
        tableName,
        tableName,
      ),
    );
  }

  public async upsert(
    tableKey: keyof typeof TableNames,
    obj: any,
    excluded: string[] = [],
    included: string[] = [],
  ): Promise<any> {
    const keys = this.getKeys(tableKey, excluded, included);
    return await this.pool
      .query(
        named(
          format(
            `
            INSERT INTO %I (%s)
            VALUES (%s)
            ON CONFLICT (%s) DO UPDATE
              SET %s
            RETURNING *;
          `,
            TableNames[tableKey],
            keys,
            keys.map(k => `:${camelCase(k)}`),
            Tables[tableKey].conflictKeys,
            keys.map(key => `${key} = excluded.${key}`),
          ),
          obj,
        ),
      )
      .then(res => camelCaseObj(res.rows[0]));
  }

  private async createEnumUnsafe(name: string, values: string[]): Promise<void> {
    const accessCodeStatusTypeAlterations = values
      .map(v => `ALTER TYPE ${name} ADD VALUE IF NOT EXISTS '${v}';`)
      .join('\n  ');
    await this.pool.query(
      `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
    CREATE TYPE ${name} AS ENUM ();
  END IF;
  ${accessCodeStatusTypeAlterations}
END$$;
      `,
    );
  }

  private async init(): Promise<void> {
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    for (const tableKey of Object.keys(TableNames)) {
      await this.createTableIfNotExists(tableKey as any);
    }
  }

  public getPool(): PG.Pool {
    return this.pool;
  }
}
