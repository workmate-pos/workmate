import PG from 'pg';
import format from 'pg-format';
import { named } from '@teifi-digital/shopify-app-express/utils/query-utils.js';
import { camelCase, camelCaseObj } from '@teifi-digital/shopify-app-express/utils/string-utils.js';
import { SessionStorage } from '@shopify/shopify-app-session-storage';
import { Session } from '@shopify/shopify-api';
import type { ShopSettings } from '../schemas/generated/shop-settings.js';
import { getDefaultShopSetting, getShopSettingKeys } from './settings/default-settings.js';

export const TableNames = {
  ShopifySessions: 'shopify_sessions',
  Settings: 'settings',
  WorkOrders: 'work_orders',
  WorkOrderAssignments: 'work_order_assignments',
  WorkOrderItems: 'work_order_items',
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
  Settings: {
    columnDefinitions: [
      ['shop', 'text NOT NULL'],
      ['key', 'text NOT NULL'],
      ['value', 'text'],
    ],
    extraDefinitions: ['PRIMARY KEY (shop, key)'],
    conflictKeys: ['shop', 'key'],
  },
  WorkOrders: {
    columnDefinitions: [
      ['id', 'text NOT NULL PRIMARY KEY'],
      ['status', 'text NOT NULL'],
      ['customer_id', 'text NOT NULL'],
      ['deposit_amount', 'integer NOT NULL'],
      ['tax_amount', 'integer NOT NULL'],
      ['discount_amount', 'integer NOT NULL'],
      ['due_date', 'date NOT NULL'],
    ],
    conflictKeys: ['id'],
  },
  WorkOrderAssignments: {
    columnDefinitions: [
      ['id', 'serial PRIMARY KEY'],
      ['work_order_id', 'text NOT NULL'],
      ['employee_id', 'text NOT NULL'],
    ],
    conflictKeys: ['id'],
  },
  WorkOrderItems: {
    columnDefinitions: [
      ['id', 'serial PRIMARY KEY'],
      ['work_order_id', 'text NOT NULL'],
      ['product_id', 'text NOT NULL'],
      ['unit_price', 'integer NOT NULL'],
      ['quantity', 'integer NOT NULL'],
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

  public async updateSetting<const K extends keyof ShopSettings>(
    shop: string,
    key: K,
    value: ShopSettings[K],
  ): Promise<void> {
    await this.ready;
    await this.upsert('Settings', {
      shop,
      key,
      value: JSON.stringify(value),
    });
  }

  public async findSettingsByShop(shop: string): Promise<ShopSettings> {
    await this.ready;
    const { rows } = await this.pool.query(
      format(
        `
          SELECT key, value FROM %I
          WHERE shop = $1;
        `,
        TableNames.Settings,
      ),
      [shop],
    );

    const shopSettings = {};

    for (const { key, value } of rows) {
      shopSettings[key] = JSON.parse(value);
    }

    for (const key of getShopSettingKeys()) {
      if (key in shopSettings) continue;

      const value = getDefaultShopSetting(key);
      await this.updateSetting(shop, key, value);
      shopSettings[key] = value;
    }

    return shopSettings as ShopSettings;
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

  // private dbTxStorage = new AsyncLocalStorage<{ client: PG.PoolClient }>();
  //
  // public async transaction<T>(tx: () => Promise<T>): Promise<T> {
  //   const client = await this.pool.connect();
  //   await client.query('BEGIN');
  //
  //   return this.dbTxStorage.run({ client }, async () => {
  //     try {
  //       const result = await tx();
  //       await client.query('COMMIT');
  //       return result;
  //     } catch (e) {
  //       await client.query('ROLLBACK');
  //       throw e;
  //     } finally {
  //       client.release();
  //     }
  //   });
  // }
}
