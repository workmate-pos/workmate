import { Session } from '@shopify/shopify-api';
import type { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services/graphql.js';
import { getShopSettings } from '../settings.js';
import { indexBy, unique } from '@teifi-digital/shopify-app-toolbox/array';
import { hasPropertyValue, isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { gql } from '../gql/gql.js';

export async function getProductVariants(session: Session, createWorkOrder: Pick<CreateWorkOrder, 'lineItems'>) {
  const graphql = new Graphql(session);
  const { fixedServiceCollectionId, mutableServiceCollectionId } = await getShopSettings(session.shop);

  const { nodes } = await gql.products.getMany.run(graphql, {
    fixedServiceCollectionId,
    mutableServiceCollectionId,
    ids: unique(createWorkOrder.lineItems.map(li => li.productVariantId)),
  });

  return indexBy(nodes.filter(isNonNullable).filter(hasPropertyValue('__typename', 'ProductVariant')), pv => pv.id);
}
