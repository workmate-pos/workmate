import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter as useCurrencyFormatterCommon } from '@work-orders/common/hooks/use-currency-formatter.js';

export const useCurrencyFormatter = () => useCurrencyFormatterCommon({ fetch: useAuthenticatedFetch() });

export { CurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
