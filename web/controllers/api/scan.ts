import { Authenticated, Get } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { gql } from '../../services/gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { escapeQuotationMarks } from '@work-orders/common/util/escape.js';
import { getShopSettings } from '../../services/settings.js';
import { getProductVariantIdsByMetafieldValue } from '../../services/scanner/variants.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';

@Authenticated()
export default class ScanController {
  @Get('/variant/:thing')
  async scan(req: Request<{ thing: string }>, res: Response<ScanVariantResponse>) {
    const session: Session = res.locals.shopify.session;
    const thing = req.params.thing;

    const { scanner } = await getShopSettings(session.shop);

    const parts = [];

    if (scanner.variants.sku) parts.push(`sku:"${escapeQuotationMarks(thing)}"`);
    if (scanner.variants.tags) parts.push(`tag:"${escapeQuotationMarks(thing)}"`);
    if (scanner.variants.barcode) parts.push(`barcode:"${escapeQuotationMarks(thing)}"`);

    for (const metafieldVariantId of await getProductVariantIdsByMetafieldValue(session, thing)) {
      parts.push(`id:${parseGid(metafieldVariantId).id}`);
    }

    const query = parts.join(' OR ');

    const graphql = new Graphql(session);
    const { productVariants } = await gql.products.getPage.run(graphql, { first: 25, query });

    return res.json({ variants: productVariants.nodes });
  }

  @Get('/variant-metafields')
  async getScannableMetafields(req: Request, res: Response<FetchScannableMetafieldsResponse>) {
    const session: Session = res.locals.shopify.session;
    const graphql = new Graphql(session);

    const first = 25;
    const query = 'type:single_line_text_field';

    const [product, productVariant] = await Promise.all([
      gql.metafields.getDefinitions.run(graphql, { first, query, ownerType: 'PRODUCT' }),
      gql.metafields.getDefinitions.run(graphql, { first, query, ownerType: 'PRODUCTVARIANT' }),
    ]);

    return res.json({
      product: product.metafieldDefinitions.nodes,
      variant: productVariant.metafieldDefinitions.nodes,
    });
  }

  @Get('/sync-variant-metafields')
  async syncVariantMetafields(req: Request, res: Response) {
    const session: Session = res.locals.shopify.session;
    const settings = await getShopSettings(session.shop);

    const graphql = new Graphql(session);
  }
}

export type ScanVariantResponse = {
  variants: gql.products.ProductVariantFragment.Result[];
};

export type FetchScannableMetafieldsResponse = {
  product: gql.metafields.MetafieldDefinitionFragment.Result[];
  variant: gql.metafields.MetafieldDefinitionFragment.Result[];
};
