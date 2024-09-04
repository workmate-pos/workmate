import { DetailedSerial } from '@web/services/serials/get.js';
import { CreateSerial } from '@web/schemas/generated/create-serial.js';

export function getCreateSerialFromDetailedSerial(detailedSerial: DetailedSerial): CreateSerial {
  return {
    productVariantId: detailedSerial.productVariant.id,
    serial: detailedSerial.serial,
    note: detailedSerial.note,
    customerId: detailedSerial.customer?.id ?? null,
    locationId: detailedSerial.location?.id ?? null,
  };
}
