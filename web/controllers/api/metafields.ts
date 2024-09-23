import { Authenticated, Post } from '@teifi-digital/shopify-app-express/decorators';
import { syncProductOrVariantMetafields } from '../../services/metafields/sync.js';
import { Session } from '@shopify/shopify-api';
import { Request, Response } from 'express-serve-static-core';

@Authenticated()
export default class MetafieldsController {
  @Post('/sync/products')
  async syncProductMetafields(req: Request, res: Response) {
    const session: Session = res.locals.shopify.session;
    await syncProductOrVariantMetafields(session, 'product');
    return res.sendStatus(200);
  }

  @Post('/sync/variants')
  async syncVariantMetafields(req: Request, res: Response) {
    const session: Session = res.locals.shopify.session;
    await syncProductOrVariantMetafields(session, 'variant');
    return res.sendStatus(200);
  }
}
