import { Fetch } from './fetch.js';
import { useMutation, useQueryClient } from 'react-query';
import { CreateSpecialOrderResponse } from '@web/controllers/api/special-orders.js';
import { CreateSpecialOrder } from '@web/schemas/generated/create-special-order.js';
import { useSpecialOrderQuery } from './use-special-order-query.js';
import { UseQueryData } from './react-query.js';

export const useSpecialOrderMutation = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (createSpecialOrder: CreateSpecialOrder) => {
      const response = await fetch('/api/special-orders', {
        method: 'POST',
        body: JSON.stringify(createSpecialOrder),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create special order');
      }

      const { specialOrder }: CreateSpecialOrderResponse = await response.json();
      return specialOrder;
    },
    onSuccess(...args) {
      const [specialOrder] = args;

      queryClient.invalidateQueries(['special-orders']);
      queryClient.setQueryData(
        ['special-order', specialOrder.name],
        specialOrder satisfies UseQueryData<typeof useSpecialOrderQuery>,
      );
      queryClient.invalidateQueries(['work-order']);
      queryClient.invalidateQueries(['work-order-info']);
    },
  });
};
