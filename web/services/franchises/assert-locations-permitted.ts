import { getShopSettings } from '../settings/settings.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getStaffMemberLocations, getStaffMembers } from '../staff-members/queries.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export async function assertLocationsPermitted({
  shop,
  locationIds,
  staffMemberId,
}: {
  shop: string;
  locationIds: ID[];
  staffMemberId: ID;
}) {
  const [{ franchises }, [staffMember], staffMemberLocations] = await Promise.all([
    getShopSettings(shop),
    getStaffMembers(shop, [staffMemberId]),
    getStaffMemberLocations([staffMemberId]),
  ]);

  if (
    franchises.enabled &&
    !staffMember?.superuser &&
    locationIds.some(locationId => !staffMemberLocations?.some(location => location.locationId === locationId))
  ) {
    throw new HttpError('You are not authorized to access this location', 401);
  }
}
