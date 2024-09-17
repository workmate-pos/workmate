import { useMutation, useQueryClient } from 'react-query';
import { UpsertServiceResponse } from '@web/controllers/api/services.js';
import { Fetch } from './fetch.js';
import { match, P } from 'ts-pattern';
import { UpsertService } from '@web/schemas/upsert-service.js';
import { UseQueryData } from './react-query.js';
import { useServiceQuery } from './use-service-query.js';
import { identity } from '@teifi-digital/shopify-app-toolbox/functional';

export const useServiceMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (service: UpsertService | URLSearchParams | HTMLFormElement) => {
      const searchParams = match(service)
        .with(P.instanceOf(URLSearchParams), identity)
        .with(
          P.instanceOf(HTMLFormElement),
          service =>
            new URLSearchParams(
              Object.fromEntries([...new FormData(service).entries()].map(([key, value]) => [key, String(value)])),
            ),
        )
        .otherwise(service => {
          const body = new URLSearchParams();

          for (const [key, value] of Object.entries(service)) {
            for (const flatValue of [value].flat()) {
              body.append(key, flatValue);
            }
          }

          return body;
        });

      const response = await fetch('/api/services', {
        method: 'POST',
        body: searchParams.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (response.status >= 500) {
        throw new Error('Failed to upsert service');
      }

      const result: UpsertServiceResponse = await response.json();
      return result;
    },
    onSuccess(result) {
      if (result.variant) {
        queryClient.invalidateQueries(['services']);
        queryClient.setQueryData(
          ['service', result.variant.id],
          result.variant satisfies UseQueryData<typeof useServiceQuery>,
        );
      }
    },
  });
};
