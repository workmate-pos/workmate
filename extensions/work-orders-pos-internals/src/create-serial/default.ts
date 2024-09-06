import { CreateSerial } from '@web/schemas/generated/create-serial.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';

export type WIPCreateSerial = Omit<CreateSerial, 'serial'> & {
  serial: CreateSerial['serial'] | null;
};

export const getDefaultCreateSerial = (productVariantId: ID): WIPCreateSerial => ({
  productVariantId,
  locationId: null,
  serial: null,
  note: '',
});
