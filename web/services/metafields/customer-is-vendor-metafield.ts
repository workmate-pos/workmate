import { MetafieldDefinitionInput } from '../gql/queries/generated/schema.js';
import { WithRequired } from '../../util/types.js';

export const customerIsVendorMetafield: WithRequired<MetafieldDefinitionInput, 'namespace'> = {
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
