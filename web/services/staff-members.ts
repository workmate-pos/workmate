import { assertGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { gql } from './gql/gql.js';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { hasReadUsersScope } from './shop.js';
import { escapeLike } from './db/like.js';
import * as queries from './staff-members/queries.js';
import { StaffMemberPaginationOptions } from '../schemas/generated/staff-member-pagination-options.js';
import { groupBy } from '@teifi-digital/shopify-app-toolbox/array';

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
  paginationOptions: StaffMemberPaginationOptions,
): Promise<gql.staffMember.getPage.Result> {
  const graphql = new Graphql(session);

  if (
    !!paginationOptions.role ||
    !!paginationOptions.locationId ||
    typeof paginationOptions.superuser === 'boolean' ||
    !(await hasReadUsersScope(graphql))
  ) {
    const query = paginationOptions.query ? `%${escapeLike(paginationOptions.query)}%` : undefined;
    const employees = await queries.getStaffMembersPage(session.shop, { query });
    const employeeLocations = groupBy(
      await queries.getStaffMemberLocations(employees.map(employee => employee.staffMemberId)),
      location => location.staffMemberId,
    );

    return {
      shop: {
        staffMembers: {
          nodes: employees
            .filter(employee => !paginationOptions.role || paginationOptions.role === employee.role)
            .filter(
              employee =>
                paginationOptions.superuser === undefined || paginationOptions.superuser === employee.superuser,
            )
            .filter(
              employee =>
                !paginationOptions.locationId ||
                employeeLocations[employee.staffMemberId]?.some(
                  location => paginationOptions.locationId === location.locationId,
                ),
            )
            .map(e => ({ isShopOwner: e.isShopOwner, name: e.name, id: e.staffMemberId, email: e.email })),
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
