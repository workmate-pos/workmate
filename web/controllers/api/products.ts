import { Authenticated, BodySchema, Post } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { CreateProduct } from '../../schemas/generated/create-product.js';
import { gql } from '../../services/gql/gql.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { GraphqlUserErrors, HttpError } from '@teifi-digital/shopify-app-express/errors';
import {
  parseProductVariantMetafields,
  ProductVariantFragmentWithComponents,
  ProductVariantFragmentWithMetafields,
} from '../../services/product-variant.js';
import { MetafieldInput } from '../../services/gql/queries/generated/schema.js';
import { productServiceTypeMetafield } from '../../services/metafields/product-service-type-metafield.js';
import { SERVICE_METAFIELD_VALUE_TAG_NAME } from '@work-orders/common/metafields/product-service-type.js';
import { ensureMetafieldDefinitionExists } from '../../services/metafields/installable-metafield-service.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';

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
      costPrice,
      locationId,
      productType,
      availableQuantity,
      allowOutOfStockPurchases,
      serviceType,
    } = req.body;

    const graphql = new Graphql(session);

    const metafields: MetafieldInput[] = [];
    const tags: string[] = [];

    if (serviceType) {
      await ensureMetafieldDefinitionExists(graphql, productServiceTypeMetafield);
      metafields.push({
        namespace: productServiceTypeMetafield.namespace,
        key: productServiceTypeMetafield.key,
        type: productServiceTypeMetafield.type,
        value: serviceType,
      });
      tags.push(SERVICE_METAFIELD_VALUE_TAG_NAME[serviceType]);
    }

    try {
      const { productCreate } = await gql.products.create.run(graphql, {
        input: {
          title,
          vendor,
          productType,
          status: 'ACTIVE',
          // variants: [
          //   {
          //     sku,
          //     price,
          //     barcode,
          //     inventoryPolicy: allowOutOfStockPurchases ? 'CONTINUE' : 'DENY',
          //     inventoryItem: {
          //       cost: costPrice,
          //       tracked: true,
          //     },
          //     inventoryQuantities: locationId ? [{ availableQuantity, locationId }] : [],
          //   },
          // ],
          metafields,
          tags,
        },
      });

      if (!productCreate?.product) {
        throw new HttpError('Failed to create product', 500);
      }

      const product = productCreate.product;

      const { productVariantsBulkCreate } = await gql.products.createVariants.run(graphql, {
        productId: product.id,
        strategy: 'REMOVE_STANDALONE_VARIANT',
        variants: [
          {
            price,
            barcode,
            inventoryPolicy: allowOutOfStockPurchases ? 'CONTINUE' : 'DENY',
            inventoryItem: {
              cost: costPrice ? BigDecimal.fromMoney(costPrice).toDecimal() : null,
              tracked: true,
            },
            inventoryQuantities: locationId ? [{ availableQuantity, locationId }] : [],
          },
        ],
      });

      if (!productVariantsBulkCreate?.productVariants) {
        throw new HttpError('Failed to create product variants', 500);
      }

      const [productVariant] = productVariantsBulkCreate.productVariants;

      if (!productVariant) {
        throw new HttpError('Failed to create product variant', 500);
      }

      const { inventoryItemUpdate } = await gql.inventoryItems.updateInventoryItem.run(graphql, {
        id: productVariant.inventoryItem.id,
        input: { sku },
      });

      if (!inventoryItemUpdate?.inventoryItem?.id) {
        throw new HttpError('Failed to update inventory item', 500);
      }

      return res.json({
        product: {
          id: product.id,
          variant: {
            ...parseProductVariantMetafields(productVariant),
            productVariantComponents: [],
          },
        },
      });
    } catch (error) {
      if (error instanceof GraphqlUserErrors) {
        const message = error.userErrors[0]?.message ?? 'Unknown user error';
        throw new HttpError(message, 400);
      }

      throw error;
    }
  }
}

export type CreateProductResponse = {
  product: {
    id: ID;
    variant: ProductVariantFragmentWithMetafields & ProductVariantFragmentWithComponents;
  };
};
