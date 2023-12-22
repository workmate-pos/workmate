import { useExtensionApi } from '@shopify/retail-ui-extensions-react';

export const useAuthenticatedFetch = () => {
  const api = useExtensionApi<'pos.home.modal.render'>();

  return async (input: RequestInfo | URL, init: RequestInit = {}) => {
    let requestUrl = input;

    if (typeof input === 'string') {
      requestUrl = new URL(input, process.env.APP_URL);
    }

    init.headers = new Headers(init.headers ?? {});

    if (init.body) {
      if (!init.headers.has('content-type')) {
        init.headers.set('content-type', 'application/json');
      }

      if (!init.method) {
        init.method = 'POST';
      }
    }

    const sessionToken = await api.session.getSessionToken();

    init.headers.set('authorization', `Bearer ${sessionToken}`);

    const response = await fetch(requestUrl, init);

    if (!response.ok) {
      api.toast.show(`${response.status} - ${input.toString()} - ${await response.clone().text()}`, { duration: 2000 });
    }

    return response;
  };
};
