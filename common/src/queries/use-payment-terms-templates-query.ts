import { FetchPaymentTermsResponse } from '@web/controllers/api/payment-terms.js';
import type { PaymentTermsType } from '@web/services/gql/queries/generated/schema.js';
import { Fetch } from './fetch.js';
import { useQueries, useQuery } from '@tanstack/react-query';

const fetchPaymentTermsTemplates = async (fetch: Fetch, type: PaymentTermsType) => {
  const response = await fetch(`/api/payment-terms/templates/${encodeURIComponent(type)}`);

  if (!response.ok) {
    throw new Error('Failed to fetch payment terms templates');
  }

  const results: FetchPaymentTermsResponse = await response.json();
  return results.paymentTermsTemplates;
};

export const usePaymentTermsTemplatesQuery = ({ fetch, type }: { fetch: Fetch; type: PaymentTermsType }) =>
  useQuery({
    queryKey: ['payment-terms-templates', type],
    queryFn: () => fetchPaymentTermsTemplates(fetch, type),
  });

export const usePaymentTermsTemplatesQueries = ({ fetch, types }: { fetch: Fetch; types: PaymentTermsType[] }) => {
  const queries = useQueries({
    queries: types.map(type => ({
      queryKey: ['payment-terms-templates', type],
      queryFn: () => fetchPaymentTermsTemplates(fetch, type),
    })),
  });
  return Object.fromEntries(types.map((type, i) => [type, queries[i]!]));
};
