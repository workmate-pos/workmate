import { useAuthenticatedFetch as useAuthenticatedFetchTeifi, } from '@teifi-digital/shopify-app-react';
export const useAuthenticatedFetch = ({ setToastAction, reauthOptions = { redirect: false }, }) => {
    const fetch = useAuthenticatedFetchTeifi(setToastAction);
    return (uri, options) => fetch(uri, options, reauthOptions);
};
