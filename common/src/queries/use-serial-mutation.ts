import { Fetch } from './fetch.js';
import { useMutation, useQueryClient } from 'react-query';
import { UseQueryData } from './react-query.js';
import { useSerialQuery } from './use-serial-query.js';
import { CreateSerial } from '@web/schemas/generated/create-serial.js';
import { CreateSerialResponse } from '@web/controllers/api/serials.js';

export const useSerialMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (createSerial: CreateSerial) => {
      const response = await fetch('/api/serials', {
        method: 'POST',
        body: JSON.stringify(createSerial),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create serial');
      }

      const serial: CreateSerialResponse = await response.json();
      return serial;
    },
    onSuccess(serial) {
      queryClient.invalidateQueries(['serials']);
      queryClient.invalidateQueries(['serial', serial satisfies UseQueryData<typeof useSerialQuery>]);
    },
  });
};