import { MetafieldDefinitionInput } from '../gql/queries/generated/schema.js';

export const customerIsVendorMetafield: MetafieldDefinitionInput = {
  name: 'Is Vendor',
  key: 'is-vendor',
  type: 'boolean',
  ownerType: 'CUSTOMER',
  namespace: '$app',
  description: 'Whether this custom is a vendor. Vendors are selectable within Purchase Orders on POS.',
  access: {
    admin: 'MERCHANT_READ_WRITE',
  },
  pin: true,
};
