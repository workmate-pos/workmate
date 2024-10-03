import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { gql } from './gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { hasReadUsersScope } from './shop.js';
import { PaginationOptions } from '../schemas/generated/pagination-options.js';
import { escapeLike } from './db/like.js';
import * as queries from './staff-members/queries.js';

export async function getStaffMembersByIds(
  session: Session,
  ids: ID[],
): Promise<(gql.staffMember.StaffMemberFragment.Result | null)[]> {
  const graphql = new Graphql(session);

  if (!(await hasReadUsersScope(graphql))) {
    const employees = await queries.getStaffMembers(session.shop, ids);
    return employees.map(e => {
      assertGid(e.staffMemberId);
      return {
        __typename: 'StaffMember',
        isShopOwner: e.isShopOwner,
        name: e.name,
        id: e.staffMemberId,
        email: e.email,
      };
    });
  }

  const { nodes } = await gql.staffMember.getMany.run(graphql, { ids });

  return nodes.map(node => {
    if (node?.__typename === 'StaffMember') {
      return node;
    }

    return null;
  });
}

export async function getStaffMembersPage(
  session: Session,
  paginationOptions: PaginationOptions,
): Promise<gql.staffMember.getPage.Result> {
  const graphql = new Graphql(session);

  if (!(await hasReadUsersScope(graphql))) {
    const query = paginationOptions.query ? escapeLike(`%${paginationOptions.query}%`) : undefined;
    const employees = await queries.getStaffMembersPage(session.shop, { query });

    return {
      shop: {
        staffMembers: {
          nodes: employees.map(e => {
            assertGid(e.staffMemberId);
            return { isShopOwner: e.isShopOwner, name: e.name, id: e.staffMemberId, email: e.email };
          }),
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      },
    };
  }

  const {
    shop: {
      staffMembers: { nodes, pageInfo },
    },
  } = await gql.staffMember.getPage.run(graphql, paginationOptions);

  return {
    shop: {
      staffMembers: {
        nodes: nodes.filter(
          node => !paginationOptions.query || node.name.toLowerCase().includes(paginationOptions.query.toLowerCase()),
        ),
        pageInfo,
      },
    },
  };
}
