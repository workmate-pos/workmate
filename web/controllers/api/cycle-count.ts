import { Authenticated, BodySchema, Post } from '@teifi-digital/shopify-app-express/decorators';
import { PostCycleCount } from '../../schemas/generated/post-cycle-count.js';
import { Request, Response } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../../services/gql/gql.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { Permission } from '../../decorators/permission.js';

@Authenticated()
export default class CycleCountController {
  @Post('/')
  @BodySchema('post-cycle-count')
  @Permission('cycle_count')
  async postCycleCount(req: Request<unknown, unknown, PostCycleCount>, res: Response<PostCycleCountResponse>) {
    const session: Session = res.locals.shopify.session;
    const cycleCount = req.body;

    const productVariantIds = cycleCount.productVariants.map(pv => pv.id);

    if (productVariantIds.length === 0) {
      return res.json({ success: true });
    }

    if (productVariantIds.length !== unique(productVariantIds).length) {
      throw new HttpError('Duplicate product variant ids', 400);
    }

    const graphql = new Graphql(session);
    const products = await gql.products.getMany.run(graphql, { ids: productVariantIds }).then(res => {
      return res.nodes.map(node => {
        if (node?.__typename !== 'ProductVariant') {
          throw new HttpError('Product variant not found', 400);
        }

        return node;
      });
    });

    // TODO: Store this in the database for easy undoing. Make sure that we return the current inventory counts in the same query

    const { inventorySetOnHandQuantities } = await gql.inventory.setOnHand.run(graphql, {
      input: {
        reason: 'cycle_count_available',
        setQuantities: products.map(pv => ({
          locationId: cycleCount.locationId,
          quantity: cycleCount.productVariants.find(hasPropertyValue('id', pv.id))?.quantity ?? never(),
          inventoryItemId: pv.inventoryItem.id,
        })),
      },
    });

    if (!inventorySetOnHandQuantities) {
      throw new HttpError('Failed to adjust inventory', 500);
    }

    return res.json({ success: true });
  }
}

export type PostCycleCountResponse = { success: true };
