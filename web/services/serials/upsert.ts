import { CreateSerial } from '../../schemas/generated/create-serial.js';
import { ensureProductVariantsExist } from '../product-variants/sync.js';
import { Session } from '@shopify/shopify-api';
import { ensureLocationsExist } from '../locations/sync.js';
import * as queries from './queries.js';
import { assertLocationsPermitted } from '../franchises/assert-locations-permitted.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { LocalsTeifiUser } from '../../decorators/permission.js';

// TODO: Also on client make location mandatory
export async function upsertSerial(session: Session, user: LocalsTeifiUser, createSerial: CreateSerial) {
  if (!createSerial.locationId) {
    throw new HttpError('Location is required', 400);
  }

  await assertLocationsPermitted({
    shop: session.shop,
    locationIds: [createSerial.locationId],
    staffMemberId: user.staffMember.id,
  });

  await Promise.all([
    ensureProductVariantsExist(session, [createSerial.productVariantId]),
    ensureLocationsExist(session, [createSerial.locationId]),
  ]);

  await queries.upsertSerials(session.shop, [
    {
      serial: createSerial.serial,
      productVariantId: createSerial.productVariantId,
      locationId: createSerial.locationId,
      note: createSerial.note,
      sold: false,
    },
  ]);
}
