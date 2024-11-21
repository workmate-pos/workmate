import { gql } from '../gql/gql.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Session } from '@shopify/shopify-api';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { CountryCode, MailingAddressInput } from '../gql/queries/generated/schema.js';

export function getMailingAddressInput(
  address: gql.companies.CompanyAddressFragment.Result | gql.customer.CustomerAddressFragment.Result | null | undefined,
): MailingAddressInput | null {
  if (!address) {
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
  } = {
    companyName: null,
    ...address,
  };

  return {
    zip,
    provinceCode,
    countryCode: countryCode as CountryCode,
    phone,
    address2,
    lastName,
    firstName,
    company,
    address1,
    city,
  };
}

export async function getMailingAddressInputsForCompanyLocation(
  session: Session,
  companyLocationId?: ID | undefined | null,
) {
  if (!companyLocationId) {
    return { billingAddress: null, shippingAddress: null };
  }

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
