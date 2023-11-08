import 'dotenv/config';
import { createServer } from '@teifi-digital/shopify-app-express/server.js';
import webhookHandlers from './services/webhooks.js';
import { resolve } from 'path';
import { db } from './db.js';

createServer(resolve('.'), { sessionStorage: db }, webhookHandlers);
