import { Session } from '@shopify/shopify-api';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import * as queries from './queries.js';
import { assertLocationsPermitted } from '../franchises/assert-locations-permitted.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';

/**
 * Check the current inventory and plan reorders for the given location
 */
export async function getReorderQuantities(session: Session, locationId: ID, user: LocalsTeifiUser) {
  await assertLocationsPermitted({
    shop: session.shop,
    staffMemberId: user.staffMember.id,
    locationIds: [locationId],
  });

  return await queries.getReorderQuantities(session.shop, locationId);
}
