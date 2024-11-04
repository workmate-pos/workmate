import { useLocationsQuery } from '@work-orders/common/queries/use-locations-query.js';

export function useLocationOptions() {
  const locationsQuery = useLocationsQuery({
    fetch,
    params: {},
  });

  const options = [
    { label: 'Default (All Locations)', value: '' },
    ...(locationsQuery.data?.pages.flat() ?? []).map(location => ({
      label: location.name,
      value: location.id,
    })),
  ];

  return {
    options,
    isLoading: locationsQuery.isLoading,
    error: locationsQuery.error,
  };
}
