import { gql } from '../gql/gql.js';
import type { MetaobjectDefinition } from './index.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { parseBoolean, parseMoney } from './parsers.js';

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
      {
        name: 'Customize Amount',
        key: 'customize-amount',
        type: 'boolean',
        description: 'Whether the amount can be changed by inside of POS',
        required: true,
      },
      {
        name: 'Removable',
        key: 'removable',
        type: 'boolean',
        description: 'Whether this charge can be removed',
        required: true,
      },
    ],
  },
  parse(metaobject: gql.products.FixedPriceLabourChargeFragment.Result) {
    return {
      id: metaobject.id,
      type: 'fixed-price-labour-charge',
      name: metaobject.name?.value ?? never(),
      amount: parseMoney(metaobject.amount?.value),
      customizeAmount: parseBoolean(metaobject.customizeAmount?.value ?? 'true'),
      removable: parseBoolean(metaobject.removable?.value ?? 'true'),
    } as const;
  },
} as const satisfies MetaobjectDefinition;
