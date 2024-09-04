import { CreateSerial } from '../../schemas/generated/create-serial.js';
import { ensureProductVariantsExist } from '../product-variants/sync.js';
import { Session } from '@shopify/shopify-api';
import { ensureLocationsExist } from '../locations/sync.js';
import { ensureCustomersExist } from '../customer/sync.js';
import * as queries from './queries.js';

export async function upsertSerial(session: Session, createSerial: CreateSerial) {
  await Promise.all([
    ensureProductVariantsExist(session, [createSerial.productVariantId]),
    createSerial.locationId ? ensureLocationsExist(session, [createSerial.locationId]) : null,
    createSerial.customerId ? ensureCustomersExist(session, [createSerial.customerId]) : null,
  ]);

  await queries.upsertSerials(session.shop, [
    {
      serial: createSerial.serial,
      productVariantId: createSerial.productVariantId,
      customerId: createSerial.customerId,
      locationId: createSerial.locationId,
      note: createSerial.note,
    },
  ]);
}
