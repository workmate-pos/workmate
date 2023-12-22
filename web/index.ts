import 'dotenv/config';
import { createServer } from '@teifi-digital/shopify-app-express/server.js';
import webhookHandlers from './services/webhooks.js';
import { resolve } from 'path';
import { ShopifySessionStorage } from './services/shopify-sessions.js';

const sessionStorage = new ShopifySessionStorage();

createServer({
  baseDir: resolve('.'),
  appConfig: { sessionStorage, useOnlineTokens: true },
  webhookHandlers,
});
