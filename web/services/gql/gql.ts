import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { Input } from './queries/generated/schema.js';

export * as gql from './queries/generated/queries.js';

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

export async function fetchAllPages<R, N>(
  graphql: Graphql,
  fn: (graphql: Graphql, variables: Input<{ after: string | null }>) => Promise<R>,
  extract: (result: R) => { nodes: N[]; pageInfo: PageInfo },
  initialEndCursor: string | null = null,
): Promise<N[]> {
  const nodes: N[] = [];
  let pageInfo: PageInfo = { hasNextPage: true, endCursor: initialEndCursor };

  while (pageInfo.hasNextPage) {
    const result = await fn(graphql, { after: pageInfo.endCursor });
    const page = extract(result);
    nodes.push(...page.nodes);
    pageInfo = page.pageInfo;
  }

  return nodes;
}
