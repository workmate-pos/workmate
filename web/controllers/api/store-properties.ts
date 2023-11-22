import { Session } from '@shopify/shopify-api';
import { getStoreProperties, updateStoreProperties } from '../../services/store-properties.js';
import { Authenticated, Get, Post } from '@teifi-digital/shopify-app-express/decorators/default';

@Authenticated()
export default class StorePropertiesController {
  @Get('/')
  async fetchStoreProperties(req: any, res: any) {
    const session: Session = res.locals.shopify.session;
    const storeProperties = await getStoreProperties(session);
    return res.json({ storeProperties });
  }

  @Post('/sync')
  async syncStoreProperties(req: any, res: any) {
    const session: Session = res.locals.shopify.session;
    await updateStoreProperties(session);
    return res.json({ success: true });
  }
}
