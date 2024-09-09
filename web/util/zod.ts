import { z } from 'zod';
import { isGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { DateTime } from '../services/gql/queries/generated/schema.js';
import { BigDecimal, Decimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { isGidWithNamespace } from '@work-orders/common/util/gid.js';

export const zID = z.string().refine(isGid);
export const zNamespacedID = (type: string) => z.string().refine(isGidWithNamespace(type));
export const zDateTime = z
  .string()
  .refine((value): value is DateTime => !isNaN(new Date(value).getTime()), { message: 'Not a valid date' });
export const zMoney = z.string().refine((text): text is Money => BigDecimal.isValid(text));
export const zDecimal = z.string().refine((text): text is Decimal => BigDecimal.isValid(text));

export const zQsBool = z
  .string()
  .refine(value => value === 'true' || value === 'false' || value === '1' || value === '0' || value === '')
  .transform(value => value === 'true' || value === '1' || value === '');

// CSV files can't have undefined/null, so transform empty strings to null instead when making something optional
export const csvNullable = <const T extends z.ZodType>(type: T) =>
  z.preprocess(arg => (arg === '' ? null : arg), type.nullable());

export const csvBool = z
  .string()
  .refine(value => value === 'true' || value === 'false' || value === '1' || value === '0' || value === '')
  .transform(value => value === 'true' || value === '1');
