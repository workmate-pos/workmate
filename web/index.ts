import 'dotenv/config';
import { createServer } from '@teifi-digital/shopify-app-express/server.js';
import webhookHandlers from './services/webhooks.js';
import { resolve } from 'path';
import { ShopifySessionStorage } from './services/shopify-sessions.js';
import { installableMetaobjectService } from './services/metaobjects/index.js';
import { installableMetafieldService } from './services/metafields/index.js';

installableMetaobjectService.register();
installableMetafieldService.register();

export const sessionStorage = new ShopifySessionStorage();

createServer({
  baseDir: resolve('.'),
  appConfig: { sessionStorage },
  webhookHandlers,
}).then(async app => {
  console.log(`Configured Shopify API Key: '${process.env.SHOPIFY_API_KEY}'`);
});
