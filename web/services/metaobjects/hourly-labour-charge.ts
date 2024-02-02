import type { MetaobjectDefinition } from './index.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { Decimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { gql } from '../gql/gql.js';

export const hourlyLabourChargeMetaobject = {
  definition: {
    type: '$app:hourly-labour-charge',
    name: 'Hourly labour charge',
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
        name: 'Hourly Rate',
        key: 'rate',
        type: 'money',
        required: true,
      },
      {
        name: 'Hours',
        key: 'hours',
        type: 'number_decimal',
        required: true,
      },
    ],
  },
  parse(metaobject: gql.products.HourlyLabourChargeFragment.Result) {
    return {
      type: 'hourly-labour-charge',
      name: metaobject.name?.value ?? never(),
      rate: JSON.parse(metaobject.rate?.value ?? never()).amount as Money,
      hours: JSON.parse(metaobject.hours?.value ?? never()).amount as Decimal,
    } as const;
  },
} as const satisfies MetaobjectDefinition;
