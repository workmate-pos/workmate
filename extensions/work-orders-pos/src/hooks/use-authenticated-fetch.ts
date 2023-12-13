import { useExtensionApi } from '@shopify/retail-ui-extensions-react';

export const useAuthenticatedFetch = () => {
  const api = useExtensionApi<'pos.home.modal.render'>();

  return async (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (typeof input === 'string') {
      input = new URL(input, process.env.APP_URL);
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

    return fetch(input, init);
  };
};
