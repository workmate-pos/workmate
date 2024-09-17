import { Glob } from 'glob';
import { fileURLToPath } from 'url';
import path from 'path';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import crypto from 'crypto';
import * as fs from 'fs';
import { db } from '../db.js';

// ESM specific
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type Migration = {
  name: string;
  checksum: string;
  run: () => Promise<void>;
};

/**
 * Get all migrations from the migrations directory
 */
async function getLocalMigrations() {
  const migrations: Migration[] = [];
  const files = new Glob(__dirname + '/**/migration.{js,ts}', {});
  for await (const file of files) {
    const importPath = file.replace(__dirname, '.').replace('.ts', '');
    const migrationName = importPath.split('/')[1]!;
    const runMigration = await import(importPath);

    const fileContent = fs.readFileSync(file, 'utf8');
    const checksum = crypto.createHash('md5').update(fileContent).digest('hex');

    migrations.push({
      name: migrationName,
      checksum,
      run: runMigration.default,
    });
  }
  return migrations.toSorted((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all migrations that have not been run,
 * and verify that no migrations have been modified
 */
async function getNewMigrations() {
  const loggedMigrations = await db.appMigration.getAll();
  const failedMigrations = loggedMigrations.filter(m => m.status !== 'SUCCESS');
  if (failedMigrations.length > 0) {
    const e = new Error('Previous migrations failed. Please fix them before running new migrations.');
    sentryErr(e, {
      failedMigrations,
    });
    throw e;
  }

  const newMigrations: Migration[] = [];
  const localMigrations = await getLocalMigrations();
  for (const migration of localMigrations) {
    const loggedMigration = loggedMigrations.find(m => m.name === migration.name);
    if (loggedMigration == null) {
      newMigrations.push(migration);
    } else if (loggedMigration.checksum !== migration.checksum) {
      const e = new Error(
        `Migration '${migration.name}' has been modified since last run.` +
          ' Please fix it before running new migrations.' +
          ` Expected checksum '${loggedMigration.checksum}', actual checksum was '${migration.checksum}'.`,
      );
      sentryErr(e, { migration, loggedMigration });
      throw e;
    }
  }

  return newMigrations;
}

/**
 * Run all pending migrations
 */
export async function runMigrations() {
  const migrations = await getNewMigrations();
  if (migrations.length === 0) {
    console.log('No new migrations to run.');
    return;
  }

  console.log(`Running ${migrations.length} migration(s)...`);
  for (const { name, checksum, run } of migrations) {
    console.log(`Running migration '${name}'...`);
    let [migration = never()] = await db.appMigration.insert({ name, checksum, status: 'PENDING' });
    try {
      await run();
      [migration = never()] = await db.appMigration.updateStatus({ name, status: 'SUCCESS' });
      console.log(`Migration '${name}' ran successfully.`);
    } catch (e) {
      [migration = never()] = await db.appMigration.updateStatus({ name, status: 'FAILURE' });
      sentryErr(e, { migration });
      throw e;
    }
  }
}
