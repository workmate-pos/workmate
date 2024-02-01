import { InstallableMetaobjectService } from './installable-metaobject-service.js';
import type { MetaobjectDefinitionCreateInput } from '../gql/queries/generated/schema.js';
import { fixedPriceLabourChargeMetaobject } from './fixed-price-labour-charge.js';
import { hourlyLabourChargeMetaobject } from './hourly-labour-charge.js';

export type MetaobjectDefinition = { definition: MetaobjectDefinitionCreateInput; parse: (metaobject: any) => any };

const metaobjectDefinitions = [fixedPriceLabourChargeMetaobject, hourlyLabourChargeMetaobject] as const;

export const installableMetaobjectService = new InstallableMetaobjectService(
  metaobjectDefinitions.map(d => d.definition),
);

export function removeTypePrefix(type: string) {
  return type.replace(/.+:/g, '');
}

export function parseMetaobject(
  metaobject: Parameters<(typeof metaobjectDefinitions)[number]['parse']>[0],
): ReturnType<(typeof metaobjectDefinitions)[number]['parse']> | null {
  for (const definition of metaobjectDefinitions) {
    const prefixlessType = removeTypePrefix(definition.definition.type);
    if (!metaobject.type.endsWith(prefixlessType)) {
      continue;
    }

    const parsed = definition.parse(metaobject as any);

    if (parsed) {
      return parsed;
    }
  }

  return null;
}
