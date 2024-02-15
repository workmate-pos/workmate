import { InstallableMetaobjectService } from './installable-metaobject-service.js';
import type { MetaobjectDefinitionCreateInput } from '../gql/queries/generated/schema.js';
import { fixedPriceLabourChargeMetaobject } from './fixed-price-labour-charge.js';
import { hourlyLabourChargeMetaobject } from './hourly-labour-charge.js';

export type MetaobjectDefinition = { definition: MetaobjectDefinitionCreateInput; parse: (metaobject: any) => any };

const metaobjectDefinitions = [fixedPriceLabourChargeMetaobject, hourlyLabourChargeMetaobject] as const;

export const installableMetaobjectService = new InstallableMetaobjectService(
  metaobjectDefinitions.map(d => d.definition),
);

export function replacePrefix(type: string) {
  return type.replace(/app--\d+--/g, '$app:');
}

export function parseMetaobject(
  metaobject: Parameters<(typeof metaobjectDefinitions)[number]['parse']>[0],
): ReturnType<(typeof metaobjectDefinitions)[number]['parse']> | null {
  const metaobjectDefinition = metaobjectDefinitions.find(d => replacePrefix(metaobject.type) === d.definition.type);

  if (!metaobjectDefinition) {
    return null;
  }

  return metaobjectDefinition.parse(metaobject as any);
}
