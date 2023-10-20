import 'dotenv/config';
import { createServer } from '@teifi-digital/shopify-app-express/server.js';
import { PostgresDatabase } from './services/postgres.js';
import webhookHandlers from './services/webhooks.js';
import { resolve } from 'path';

const db = new PostgresDatabase();
createServer(resolve('.'), { sessionStorage: db }, webhookHandlers);
