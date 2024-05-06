import 'dotenv/config';
import { createServer, createShopifyApp, ShopifyAppConfig } from '@teifi-digital/shopify-app-express';
import webhookHandlers from './services/webhooks.js';
import { resolve } from 'path';
import { ShopifySessionStorage } from './services/shopify-sessions.js';
import { installableMetaobjectService } from './services/metaobjects/index.js';
import { installableMetafieldService } from './services/metafields/index.js';
import { registerDecorator } from '@teifi-digital/shopify-app-express/decorators';
import { appPlanHandler, AppPlanKey } from './decorators/app-plan.js';
import { permissionHandler, PermissionKey } from './decorators/permission.js';
import { registerEnumTypes } from './services/db/types.js';
import { installableAppPlansService } from './services/app-plans/index.js';
import { installableSegmentService } from './services/segments/index.js';
import { runMigrations } from './services/db/migrations/index.js';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-01';
import { ApiVersion } from '@shopify/shopify-api';

await registerEnumTypes();

installableMetaobjectService.register();
installableMetafieldService.register();
installableAppPlansService.register();
installableSegmentService.register();

registerDecorator(AppPlanKey, appPlanHandler);
registerDecorator(PermissionKey, permissionHandler);

export const sessionStorage = new ShopifySessionStorage();

const isAppMigrate = process.env.APP_MIGRATE === 'true';

const appConfig: ShopifyAppConfig = {
  sessionStorage,
  useOnlineTokens: true,
  api: {
    apiVersion: ApiVersion.January24,
    restResources,
  },
};

if (isAppMigrate) {
  createShopifyApp(appConfig); // Only need to create the app if we're running migrations
} else {
  createServer({
    baseDir: resolve('.'),
    appConfig,
    webhookHandlers,
    registerWebhooksOnStart: false,
  }).then(async () => {
    console.log(`Configured Shopify API Key: '${process.env.SHOPIFY_API_KEY}'`);
  });
}

// Run migrations if needed
if (isAppMigrate) {
  await runMigrations();
}
