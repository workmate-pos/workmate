import type { MetaobjectDefinition } from './index.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { gql } from '../gql/gql.js';
import { parseBoolean, parseDecimal, parseMoney } from './parsers.js';

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
        name: 'Customize Hourly Rate',
        key: 'customize-rate',
        type: 'boolean',
        description: 'Whether the rate can be changed by inside of POS',
        required: true,
      },
      {
        name: 'Hours',
        key: 'hours',
        type: 'number_decimal',
        required: true,
      },
      {
        name: 'Customize Hours',
        key: 'customize-hours',
        type: 'boolean',
        description: 'Whether the hours can be changed by inside of POS',
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
  parse(metaobject: gql.products.HourlyLabourChargeFragment.Result) {
    return {
      type: 'hourly-labour-charge',
      name: metaobject.name?.value ?? never(),
      rate: parseMoney(metaobject.rate?.value),
      hours: parseDecimal(metaobject.hours?.value),
      customizeRate: parseBoolean(metaobject.customizeRate?.value ?? 'true'),
      customizeHours: parseBoolean(metaobject.customizeHours?.value ?? 'true'),
      removable: parseBoolean(metaobject.removable?.value ?? 'true'),
    } as const;
  },
} as const satisfies MetaobjectDefinition;
