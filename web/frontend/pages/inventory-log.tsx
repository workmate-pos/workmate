import { Banner, Box, Card, Frame, Page, Text } from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useInventoryMutationsQuery } from '@work-orders/common/queries/use-inventory-mutations-query.js';
import { useState } from 'react';
import { InventoryPaginationOptions } from '@web/schemas/generated/inventory-pagination-options.js';
import { TitleBar } from '@shopify/app-bridge-react';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';

const PAGE_SIZE = 100;

export default function () {
  return (
    <Frame>
      <Page>
        <InventoryLog />
      </Page>
    </Frame>
  );
}

function InventoryLog() {
  //

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const [options, setOptions] = useState<Partial<Omit<InventoryPaginationOptions, 'offset' | 'limit' | 'query'>>>({});

  const locationsQuery = useAllLocationsQuery({ fetch });
  const inventoryMutationsQuery = useInventoryMutationsQuery({
    fetch,
    options: {
      ...options,
      query,
      limit: PAGE_SIZE,
    },
  });

  return (
    <Card>
      <TitleBar title="Inventory log" />

      <Text as="h1" variant="headingMd" fontWeight="bold">
        Inventory log
      </Text>

      <Text as="p" variant="bodyMd" tone="subdued">
        View and control changes made by WorkMate to the Shopify inventory
      </Text>

      <Box paddingBlock="200"></Box>

      {inventoryMutationsQuery.isError && (
        <Box paddingBlock="200">
          <Banner
            title="Error loading locations"
            tone="critical"
            action={{
              content: 'Retry',
              onAction: () => inventoryMutationsQuery.refetch(),
            }}
          >
            {extractErrorMessage(inventoryMutationsQuery.error, 'An error occurred while inventory mutations')}
          </Banner>
        </Box>
      )}
    </Card>
  );
}
