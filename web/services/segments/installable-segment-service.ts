import { gql } from '../gql/gql.js';
import { Graphql, InstallableService, sentryErr } from '@teifi-digital/shopify-app-express/services';

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

      try {
        await gql.segments.createSegment.run(graphql, definition);
        console.log(`Created segment '${definition.name}'`);
      } catch (error) {
        sentryErr(error);
      }
    }
  }
}
