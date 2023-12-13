import { useCurrencyFormatter as useCurrencyFormatterCommon } from '@common/hooks/use-currency-formatter';
import { useAuthenticatedFetch } from './use-authenticated-fetch';

export const useCurrencyFormatter = () => useCurrencyFormatterCommon({ fetch: useAuthenticatedFetch() });

export { CurrencyFormatter } from '@common/hooks/use-currency-formatter';
