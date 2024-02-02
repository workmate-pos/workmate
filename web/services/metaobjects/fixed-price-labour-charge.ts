import { gql } from '../gql/gql.js';
import type { MetaobjectDefinition } from './index.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';

export const fixedPriceLabourChargeMetaobject = {
  definition: {
    type: '$app:fixed-price-labour-charge',
    name: 'Fixed price labour charge',
    access: {
      admin: 'MERCHANT_READ_WRITE',
      storefront: 'NONE',
    },
    displayNameKey: 'name',
    fieldDefinitions: [
      {
        name: 'Name',
        key: 'name',
        type: 'single_line_text_field',
        description: 'The name of this labour charge. Shown on receipts',
        required: true,
      },
      {
        name: 'Amount',
        key: 'amount',
        type: 'money',
        description: 'The amount of this labour charge',
        required: true,
      },
    ],
  },
  parse(metaobject: gql.products.FixedPriceLabourChargeFragment.Result) {
    return {
      type: 'fixed-price-labour-charge',
      name: metaobject.name?.value ?? never(),
      amount: JSON.parse(metaobject.amount?.value ?? never()).amount as Money,
    } as const;
  },
} as const satisfies MetaobjectDefinition;
