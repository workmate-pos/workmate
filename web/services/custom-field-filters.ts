import { Static, Type } from '@sinclair/typebox';

export const CustomFieldFilterSchema = Type.Object({
  type: Type.Literal('require-field'),
  /**
   * The name of the field to require.
   * If null, any field is required.
   */
  key: Type.Union([Type.Null(), Type.String()]),
  /**
   * A specific value the field must contain.
   */
  value: Type.Union([Type.Null(), Type.String()]),
  /**
   * Inverses the filter.
   */
  inverse: Type.Boolean(),
});

export type CustomFieldFilter = Static<typeof CustomFieldFilterSchema>;
