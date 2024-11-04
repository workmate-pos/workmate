import type { FetchAllLocationsResponse } from '@web/controllers/api/locations.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Fetch } from './fetch.js';
import { UseQueryData } from './react-query.js';
import { useLocationQuery } from './use-location-query.js';

export const useAllLocationsQuery = ({ fetch }: { fetch: Fetch }) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['locations', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/locations/all');

      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const locations: FetchAllLocationsResponse = await response.json();

      for (const location of locations) {
        queryClient.setQueryData<UseQueryData<typeof useLocationQuery>>(['location', location.id], location);
      }

      return locations;
    },
  });
};

export type Location = FetchAllLocationsResponse[number];
