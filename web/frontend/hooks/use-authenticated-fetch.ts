import {
  ToastActionCallable,
  useAuthenticatedFetch as useAuthenticatedFetchTeifi,
} from '@teifi-digital/shopify-app-react';
import { ReauthOptions } from '@teifi-digital/shopify-app-react/hooks/useAuthenticatedFetch';
import { Fetch } from '@common/queries/fetch';

export const useAuthenticatedFetch = ({
  setToastAction,
  reauthOptions,
}: {
  setToastAction: ToastActionCallable;
  reauthOptions?: ReauthOptions;
}): Fetch => {
  const fetch = useAuthenticatedFetchTeifi(setToastAction);
  return (uri: RequestInfo, options?: RequestInit) => fetch(uri, options, reauthOptions);
};
