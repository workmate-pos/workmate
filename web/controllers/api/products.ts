import { Authenticated, BodySchema, Post } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { CreateProduct } from '../../schemas/generated/create-product.js';
import { gql } from '../../services/gql/gql.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import {
  parseProductVariantMetafields,
  ProductVariantFragmentWithComponents,
  ProductVariantFragmentWithMetafields,
} from '../../services/product-variant.js';

@Authenticated()
export default class ProductsController {
  @Post('/')
  @BodySchema('create-product')
  async createProduct(req: Request<unknown, unknown, CreateProduct>, res: Response<CreateProductResponse>) {
    const session: Session = res.locals.shopify.session;
    const {
      sku,
      title,
      price,
      vendor,
      barcode,
      options,
      costPrice,
      locationId,
      productType,
      availableQuantity,
      allowOutOfStockPurchases,
    } = req.body;

    const graphql = new Graphql(session);
    const { productCreate } = await gql.products.create.run(graphql, {
      input: {
        title,
        vendor,
        productType,
        status: 'ACTIVE',
        // @ts-ignore shopify schema is broken!
        options: options.map(option => option.name),
        variants: [
          {
            sku,
            price,
            barcode,
            options: options.map(option => option.value),
            inventoryPolicy: allowOutOfStockPurchases ? 'CONTINUE' : 'DENY',
            inventoryItem: {
              cost: costPrice,
              tracked: true,
            },
            inventoryQuantities: locationId ? [{ availableQuantity, locationId }] : [],
          },
        ],
      },
    });

    if (!!productCreate?.userErrors && productCreate.userErrors.length > 0) {
      const { message } = productCreate.userErrors[0]!;
      throw new HttpError(message, 400);
    }

    if (!productCreate) {
      throw new HttpError('Failed to create product', 500);
    }

    const product = productCreate.product ?? never();
    const [productVariant = never()] = product.variants.nodes;

    return res.json({
      product: {
        id: product.id,
        variant: {
          ...parseProductVariantMetafields(productVariant),
          productVariantComponents: [],
        },
      },
    });
  }
}

export type CreateProductResponse = {
  product: {
    id: ID;
    variant: ProductVariantFragmentWithMetafields & ProductVariantFragmentWithComponents;
  };
};
