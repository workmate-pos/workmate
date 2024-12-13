import {
  ToastActionCallable,
  useAuthenticatedFetch as useAuthenticatedFetchTeifi,
} from '@teifi-digital/shopify-app-react';
import { ReauthOptions } from '@teifi-digital/shopify-app-react/hooks/useAuthenticatedFetch.js';
import { Fetch } from '@work-orders/common/queries/fetch.js';

// TODO: When moving to trpc, use custom authenticated fetch with custom error handling
export const useAuthenticatedFetch = ({
  setToastAction,
  reauthOptions = { redirect: false },
}: {
  setToastAction: ToastActionCallable;
  reauthOptions?: ReauthOptions;
}): Fetch => {
  const fetch = useAuthenticatedFetchTeifi(setToastAction);
  return (uri: RequestInfo, options?: RequestInit) => fetch(uri, options, reauthOptions);
};
