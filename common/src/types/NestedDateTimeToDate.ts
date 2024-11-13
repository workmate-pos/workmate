import { DateTime } from '@web/services/gql/queries/generated/schema.js';
import { Primitive } from '@teifi-digital/shopify-app-toolbox/types';

export type NestedDateTimeToDate<T> = T extends DateTime
  ? Date
  : T extends Primitive
    ? T
    : T extends (infer U)[]
      ? NestedDateTimeToDate<U>[]
      : T extends {}
        ? { [K in keyof T]: NestedDateTimeToDate<T[K]> }
        : T;

declare const asd: DateTime extends object ? 1 : 0;
