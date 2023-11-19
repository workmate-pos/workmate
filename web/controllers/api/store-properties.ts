import { Controller } from '@teifi-digital/shopify-app-express/controllers';
import { Session } from '@shopify/shopify-api';
import { getStoreProperties, updateStoreProperties } from '../../services/store-properties.js';

async function fetchStoreProperties(req: any, res: any) {
  const session: Session = res.locals.shopify.session;

  const storeProperties = await getStoreProperties(session);

  return res.json({ storeProperties });
}

async function syncStoreProperties(req: any, res: any) {
  const session: Session = res.locals.shopify.session;
  await updateStoreProperties(session);
  return res.json({ success: true });
}

export default {
  endpoints: [
    ['/', 'GET', fetchStoreProperties],
    ['/sync', 'POST', syncStoreProperties],
  ],
} satisfies Controller;
