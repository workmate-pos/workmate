import { Fetch } from './fetch.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UpsertLabour } from '@web/schemas/upsert-labour.js';
import { match, P } from 'ts-pattern';
import { UpsertLabourResponse } from '@web/controllers/api/labour.js';
import { useLabourQuery } from './use-labour-query.js';
import { UseQueryData } from './react-query.js';

export const useLabourMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (labour: UpsertLabour | URLSearchParams | HTMLFormElement) => {
      const searchParams = match(labour)
        .with(P.instanceOf(URLSearchParams), labour => labour)
        .with(
          P.instanceOf(HTMLFormElement),
          labour =>
            new URLSearchParams(
              Object.fromEntries([...new FormData(labour).entries()].map(([key, value]) => [key, String(value)])),
            ),
        )
        .otherwise(labour => {
          const body = new URLSearchParams();

          for (const [key, value] of Object.entries(labour)) {
            for (const flatValue of [value].flat()) {
              body.append(key, String(flatValue));
            }
          }

          return body;
        });

      const response = await fetch('/api/labour', {
        method: 'POST',
        body: searchParams.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (response.status >= 500) {
        throw new Error('Failed to upsert labour');
      }

      const result: UpsertLabourResponse = await response.json();
      return result;
    },
    onSuccess(result) {
      if (result.labour) {
        queryClient.invalidateQueries({ queryKey: ['labours'] });
        queryClient.setQueryData(
          ['labour', result.labour.id],
          result.labour satisfies UseQueryData<typeof useLabourQuery>,
        );
      }
    },
  });
};
