import 'dotenv/config';
import { createServer } from '@teifi-digital/shopify-app-express/server.js';
import webhookHandlers from './services/webhooks.js';
import { resolve } from 'path';
import { ShopifySessionStorage } from './services/shopify-sessions.js';
import { installableMetaobjectService } from './services/metaobjects/index.js';
import { installableMetafieldService } from './services/metafields/index.js';
import { appPlans } from './services/app-plans.js';
import { registerDecorator } from '@teifi-digital/shopify-app-express/decorators/registry.js';
import { appPlanHandler, AppPlanKey } from './decorators/app-plan.js';
import { permissionHandler, PermissionKey } from './decorators/permission.js';
import { registerEnumTypes } from './services/db/types.js';

await registerEnumTypes();

installableMetaobjectService.register();
installableMetafieldService.register();
appPlans.register();

registerDecorator(AppPlanKey, appPlanHandler);
registerDecorator(PermissionKey, permissionHandler);

export const sessionStorage = new ShopifySessionStorage();

createServer({
  baseDir: resolve('.'),
  appConfig: { sessionStorage, useOnlineTokens: true },
  webhookHandlers,
  registerWebhooksOnStart: false,
}).then(async app => {
  console.log(`Configured Shopify API Key: '${process.env.SHOPIFY_API_KEY}'`);
});
