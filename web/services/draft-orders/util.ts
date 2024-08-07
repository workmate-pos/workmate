import { gql } from '../gql/gql.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';

export function getMailingAddressInput(companyAddress: gql.companies.CompanyAddressFragment.Result | null) {
  if (!companyAddress) {
    return null;
  }

  const {
    zip,
    province: provinceCode,
    countryCode,
    phone,
    address2,
    lastName,
    firstName,
    companyName: company,
    address1,
    city,
  } = companyAddress;

  return {
    zip,
    provinceCode,
    countryCode,
    phone,
    address2,
    lastName,
    firstName,
    company,
    address1,
    city,
  };
}

export async function getMailingAddressInputsForCompanyLocation(session: Session, companyLocationId: ID) {
  const graphql = new Graphql(session);

  const result = await gql.companies.getCompanyLocation.run(graphql, { id: companyLocationId });

  if (!result.companyLocation) {
    throw new HttpError('Company location not found', 500);
  }

  // TODO: Just store this on the WO in db?
  return {
    shippingAddress: getMailingAddressInput(result.companyLocation.shippingAddress),
    billingAddress: getMailingAddressInput(result.companyLocation.billingAddress),
  };
}
