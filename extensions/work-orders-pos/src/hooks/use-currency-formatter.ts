import { useCurrencyFormatter as useCurrencyFormatterCommon } from '@work-orders/common/hooks/use-currency-formatter.js';
import { useAuthenticatedFetch } from './use-authenticated-fetch.js';

export const useCurrencyFormatter = () => useCurrencyFormatterCommon({ fetch: useAuthenticatedFetch() });

export { CurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
