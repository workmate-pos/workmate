import { useExtensionApi } from '@shopify/retail-ui-extensions-react';

export const useAuthenticatedFetch = ({
  throwOnError = true,
  showToastOnError = true,
}: {
  throwOnError?: boolean;
  showToastOnError?: boolean;
} = {}) => {
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
    init.cache = 'no-store';

    const response = await fetch(requestUrl, init);

    if (!response.ok && process.env.NODE_ENV === 'development') {
      api.toast.show(`${response.status} - ${input.toString()} - ${await response.clone().text()}`, { duration: 2000 });
    }

    if (!response.ok && (throwOnError || showToastOnError)) {
      let error = 'Un unknown error occurred';

      const txt = await response.clone().text();

      if (txt.trim().length > 0) {
        error = txt;
      }

      try {
        const json = JSON.parse(txt) as unknown;
        if (typeof json === 'object' && json !== null && 'error' in json && typeof json.error === 'string') {
          error = json.error;
        }
      } catch {}

      if (showToastOnError) {
        api.toast.show(error);
      }

      if (throwOnError) {
        throw new Error(error);
      }
    }

    return response;
  };
};
