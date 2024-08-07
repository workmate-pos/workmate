import { InstallableMetaobjectService } from './installable-metaobject-service.js';
import {
  MetaobjectDefinitionCreateInput,
  MetaobjectFieldDefinitionCreateInput,
} from '../gql/queries/generated/schema.js';
import { fixedPriceLabourChargeMetaobject } from './fixed-price-labour-charge.js';
import { hourlyLabourChargeMetaobject } from './hourly-labour-charge.js';
import { UnionToIntersection } from '@teifi-digital/shopify-app-toolbox/types';

export type MetaobjectDefinition = { definition: MetaobjectDefinitionCreateInput; parse: (metaobject: any) => any };

const metaobjectDefinitions = [fixedPriceLabourChargeMetaobject, hourlyLabourChargeMetaobject] as const;

export const installableMetaobjectService = new InstallableMetaobjectService(
  metaobjectDefinitions.map(d => d.definition),
);

export function replaceAppPrefix(type: string) {
  return type.replace(/app--\d+--/g, '$app:');
}

type RegisteredMetaobjectDefinition = (typeof metaobjectDefinitions)[number];

export type MetaobjectType = RegisteredMetaobjectDefinition['definition']['type'];

export type ParsedMetaobject<T extends MetaobjectType> = {
  [K in MetaobjectType]: RegisteredMetaobjectDefinition extends infer T
    ? T extends { definition: { type: K }; parse: (...args: any[]) => infer P }
      ? P
      : never
    : never;
}[T];

/**
 * Fields object for some metaobject. Should be used to ensure that all fields are provided.
 */
export type MetaobjectFields<T extends MetaobjectType> = {
  [K in MetaobjectType]: RegisteredMetaobjectDefinition extends infer T
    ? T extends { definition: { type: K; fieldDefinitions: infer F } }
      ? F extends readonly MetaobjectFieldDefinitionCreateInput[]
        ? UnionToIntersection<
            F[number] extends infer V
              ? V extends { required: true; key: infer K }
                ? K extends string
                  ? { [_ in K]: string }
                  : never
                : { [_ in F[number]['key']]?: string }
              : never
          >
        : never
      : never
    : never;
}[T];

export function parseMetaobject<const T extends MetaobjectType>(
  metaobject: Parameters<(RegisteredMetaobjectDefinition & { definition: { type: T } })['parse']>[0],
): ParsedMetaobject<T> | null {
  const metaobjectDefinition = metaobjectDefinitions.find(d => replaceAppPrefix(metaobject.type) === d.definition.type);

  if (!metaobjectDefinition) {
    return null;
  }

  return metaobjectDefinition.parse(metaobject as any) as ParsedMetaobject<T>;
}
