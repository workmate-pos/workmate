import { createCachedResource } from '../cached-resource.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { z } from 'zod';
import { LastElement } from '../../../util/types.js';
import { getShopifyObject, softDeleteShopifyObject, upsertShopifyObject } from '../queries.js';
import { MINUTE_IN_MS } from '@work-orders/common/time/constants.js';
import { fetchTypedNode } from '../gql.js';
import { Session } from '@shopify/shopify-api';
import { zDecimal, zMoney, zObjectGid, zMoneyV2 } from '../../../util/zod.js';
import { resolveNamespace } from '../../app/index.js';
import { hourlyLabourChargeMetaobject } from '../../metaobjects/hourly-labour-charge.js';
import { fixedPriceLabourChargeMetaobject } from '../../metaobjects/fixed-price-labour-charge.js';
import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { match } from 'ts-pattern';

// TODO: Cronjob to clean up product variants that are not referenced by any other table (in batches)

export const { get: getProductVariant } = createCachedResource<{ session: Session; id: ID }, CachedProductVariant>({
  getCached: async ({ session, id }) => {
    const shopifyObject = await getShopifyObject(session.shop, id);

    if (!shopifyObject) {
      return null;
    }

    const parse = schema.safeParse(shopifyObject.data);

    if (!parse.success) {
      // This should never happen given that migrations are correct.
      sentryErr(new Error('Failed to parse cached product variant', { cause: parse.error }), { shopifyObject });
      return null;
    }

    const { data } = parse;

    return {
      resource: migrateProductVariant(data),
      shouldRevalidate:
        shopifyObject.deletedAt === null &&
        (data.version !== currentVersion ||
          shopifyObject.stale ||
          Date.now() - shopifyObject.updatedAt.getTime() > 15 * MINUTE_IN_MS),
    };
  },
  getFresh: async ({ session, id }) => {
    const node = await fetchTypedNode(session, id, 'ProductVariant');

    if (!node) {
      return null;
    }

    return await parseProductVariant(session, node);
  },
  persist: ({ session, id }, resource) =>
    resource ? upsertShopifyObject(session.shop, id, resource, false) : softDeleteShopifyObject(session.shop, id),
});

const schema = z.discriminatedUnion('version', [
  z.object({
    version: z.literal(0),
    productVariantId: zObjectGid('ProductVariant'),
    productId: zObjectGid('Product'),
    inventoryItemId: zObjectGid('InventoryItem'),
    sku: z.string().nullable(),
    price: zMoney,
    barcode: z.string().nullable(),
    image: z
      .object({
        url: z.string().url(),
        altText: z.string().nullable(),
      })
      .nullable(),
    requiresComponents: z.boolean(),
    metafields: z.object({
      defaultCharges: z
        .object({
          id: zObjectGid('Metafield'),
          charges: z
            .discriminatedUnion('type', [
              z.object({
                type: z.literal('fixed-price-labour'),
                name: z.string(),
                amount: zMoneyV2,
                customizeAmount: z.boolean(),
                removable: z.boolean(),
              }),
              z.object({
                type: z.literal('hourly-labour'),
                name: z.string(),
                rate: zMoneyV2,
                hours: zDecimal,
                customizeRate: z.boolean(),
                customizeHours: z.boolean(),
                removable: z.boolean(),
              }),
            ])
            .array(),
        })
        .nullable(),
    }),
  }),
]);

const currentSchema = schema._def.options.at(-1) as LastElement<typeof schema._def.options>;
const currentVersion = currentSchema.shape.version._type;

type CurrentSchema = z.infer<typeof currentSchema>;
type CurrentVersion = typeof currentVersion;

export const CachedProductVariant = currentSchema.omit({ version: true });
export type CachedProductVariant = z.infer<typeof CachedProductVariant>;

// we always migrate the product variant to the latest version of our schema.
// we cannot simply refetch as the underlying variant may have been deleted.
// this function ensures that all variants remain accessible.
function migrateProductVariant(
  productVariant: z.infer<typeof schema>,
): z.infer<typeof schema> & { version: CurrentVersion } {
  return productVariant;
}

export async function parseProductVariant(
  session: Session,
  node: NonNullable<Awaited<ReturnType<typeof fetchTypedNode<'ProductVariant'>>>>,
): Promise<CurrentSchema> {
  const [hourlyLabourChargeMetaobjectType, fixedPriceLabourChargeMetaobjectType] = await Promise.all([
    resolveNamespace(session, hourlyLabourChargeMetaobject.definition.type),
    resolveNamespace(session, fixedPriceLabourChargeMetaobject.definition.type),
  ]);

  const [fixedPriceLabourSchema, hourlyLabourSchema] =
    currentSchema.shape.metafields.shape.defaultCharges._def.innerType.shape.charges._def.type._def.options;

  const defaultCharges = !node.defaultCharges
    ? null
    : {
        id: node.defaultCharges.id,
        charges:
          node.defaultCharges.references?.nodes
            .filter(node => !!node)
            .filter(node => node.__typename === 'Metaobject')
            .map((node): NonNullable<CurrentSchema['metafields']['defaultCharges']>['charges'][number] | null => {
              const parse = match(node)
                .with({ type: hourlyLabourChargeMetaobjectType }, () =>
                  hourlyLabourSchema.safeParse({
                    type: 'hourly-labour',
                    name: node.name?.jsonValue,
                    rate: node.rate?.jsonValue,
                    hours: node.hours?.jsonValue,
                    customizeRate: node.customizeRate?.jsonValue,
                    customizeHours: node.customizeHours?.jsonValue,
                    removable: node.removable?.jsonValue,
                  }),
                )
                .with({ type: fixedPriceLabourChargeMetaobjectType }, () =>
                  fixedPriceLabourSchema.safeParse({
                    type: 'fixed-price-labour',
                    name: node.name?.jsonValue,
                    amount: node.amount?.jsonValue,
                    customizeAmount: node.customizeAmount?.jsonValue,
                    removable: node.removable?.jsonValue,
                  }),
                )
                .otherwise(() => null);

              // parsing failing likely means that the schema is wrong.
              // this is a big issue that should be fixed immediately.

              if (!parse) {
                sentryErr(new Error('Unexpected charge metaobject type'), { node });
                return null;
              }

              if (!parse.success) {
                sentryErr(new Error('Failed to parse charge metaobject'), { node, error: parse.error });
                return null;
              }

              return parse.data;
            })
            .filter(metaobject => !!metaobject) ?? [],
      };

  return {
    version: currentVersion,
    productVariantId: node.id,
    productId: node.product.id,
    inventoryItemId: node.inventoryItem.id,
    sku: node.sku,
    price: node.price,
    barcode: node.barcode,
    image: node.image,
    requiresComponents: node.requiresComponents,
    metafields: { defaultCharges },
  };
}
