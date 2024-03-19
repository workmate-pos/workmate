import { InstallableService } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../gql/gql.js';
import { Graphql } from '@teifi-digital/shopify-app-express/services';

export type SegmentDefinition =
  | gql.segments.createSegment.Variables
  | ((graphql: Graphql) => Promise<gql.segments.createSegment.Variables>);

export type SegmentDefinitions = SegmentDefinition[];

export class InstallableSegmentService extends InstallableService {
  constructor(public readonly segmentDefinitions: SegmentDefinitions) {
    super();
  }

  override async initStore(graphql: Graphql): Promise<void> {
    for (const definitionorFn of this.segmentDefinitions) {
      const definition = typeof definitionorFn === 'function' ? await definitionorFn(graphql) : definitionorFn;

      const result = await gql.segments.createSegment.run(graphql, definition);

      if (result?.segmentCreate?.userErrors.length) {
        console.error(`Failed to create segment '${definition.name}'`, result.segmentCreate.userErrors);
      } else {
        console.log(`Created segment '${definition.name}'`);
      }
    }
  }
}
