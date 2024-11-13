import {
  reactExtension,
  useApi,
  AdminAction,
  Text,
  BlockStack,
  InlineStack,
  Image,
  Heading,
  Select,
  Button,
  Divider,
  ProgressIndicator,
} from '@shopify/ui-extensions-react/admin';
import { QueryClient, QueryClientProvider, skipToken, useQuery } from '@tanstack/react-query';
import { ID, isGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useOrderLineItemSerialsQuery } from '@work-orders/common/queries/use-order-line-item-serials-query.js';
import { useOrderLineItemSerialsMutation } from '@work-orders/common/queries/use-order-line-item-serials-mutation.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { useSerialsQuery } from '@work-orders/common/queries/use-serials-query.js';
import { Fragment, useEffect, useState } from 'react';

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.order-details.action.render';

const queryClient = new QueryClient();

export default reactExtension(TARGET, () => (
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
));

function App() {
  const { data, close } = useApi(TARGET);
  const [id = null] = data.selected.map(item => item.id).filter(isGid);

  const orderLineItemSerialsQuery = useOrderLineItemSerialsQuery({ fetch, id });
  const orderLineItemSerialsMutation = useOrderLineItemSerialsMutation({ fetch });
  const orderQuery = useOrderQuery(id);

  // serials by line item by index
  const [selectedSerials, setSelectedSerials] = useState<Record<ID, Record<number, string>>>({});

  useEffect(() => {
    if (!orderLineItemSerialsQuery.data) {
      return;
    }

    const lineItemCount: Record<ID, number> = {};

    for (const { lineItemId, serial } of orderLineItemSerialsQuery.data) {
      const index = lineItemCount[lineItemId] ?? 0;
      lineItemCount[lineItemId] = index + 1;

      setSelectedSerials(current => ({
        ...current,
        [lineItemId]: {
          ...current[lineItemId],
          [index]: serial,
        },
      }));
    }
  }, [orderLineItemSerialsQuery.data]);

  if (!id) {
    return (
      <AdminAction>
        <Text>No order selected</Text>
      </AdminAction>
    );
  }

  if (orderQuery.isError) {
    return (
      <AdminAction>
        <Text>Error loading order: {extractErrorMessage(orderQuery.error, 'an unknown error occurred')}</Text>
      </AdminAction>
    );
  }

  if (orderLineItemSerialsQuery.isError) {
    return (
      <AdminAction>
        <Text>
          Error loading order line items:{' '}
          {extractErrorMessage(orderLineItemSerialsQuery.error, 'an unknown error occurred')}
        </Text>
      </AdminAction>
    );
  }

  if (orderQuery.isPending || orderLineItemSerialsQuery.isPending) {
    return (
      <AdminAction loading>
        <Text>Loading order...</Text>
      </AdminAction>
    );
  }

  const order = orderQuery.data;
  const relevantLineItems = order.lineItems.nodes.filter(
    lineItem => lineItem.product?.usesSerialNumbers?.jsonValue === true,
  );

  if (relevantLineItems.length === 0) {
    return (
      <AdminAction>
        <Text>This order does not contain products that require serial numbers</Text>
      </AdminAction>
    );
  }

  return (
    <AdminAction
      primaryAction={
        <Button
          variant="primary"
          disabled={orderLineItemSerialsMutation.isPending}
          onClick={() =>
            orderLineItemSerialsMutation.mutate(
              {
                id,
                lineItemSerials: Object.entries(selectedSerials).flatMap(([lineItemId, serials]) =>
                  Object.values(serials).map(serial => ({ lineItemId: lineItemId as ID, serial })),
                ),
              },
              {
                onSuccess() {
                  close();
                },
              },
            )
          }
        >
          Save
        </Button>
      }
      loading={orderLineItemSerialsMutation.isPending}
    >
      <BlockStack gap="large">
        {orderLineItemSerialsMutation.isError && (
          <Text>
            Error saving serials: {extractErrorMessage(orderLineItemSerialsMutation.error, 'an unknown error occurred')}
          </Text>
        )}

        {relevantLineItems.map((lineItem, i) => (
          <Fragment key={lineItem.id}>
            {i !== 0 && <Divider />}
            <LineItemSerialInput
              orderId={id}
              lineItemId={lineItem.id}
              selectedSerials={selectedSerials}
              onSelect={(index, value) => {
                setSelectedSerials(current =>
                  removeEmptyObjects({
                    ...current,
                    [lineItem.id]: removeUndefinedValues({
                      ...current[lineItem.id],
                      [index]: value,
                    }),
                  }),
                );
              }}
            />
          </Fragment>
        ))}
      </BlockStack>
    </AdminAction>
  );
}

function useOrderQuery(id: ID | null) {
  const { query } = useApi(TARGET);

  return useQuery({
    queryKey: ['order', id],
    queryFn:
      id === null
        ? skipToken
        : async () => {
            const result = await query<
              {
                order: {
                  lineItems: {
                    nodes: {
                      id: ID;
                      name: string;
                      quantity: number;
                      sku: string;
                      variant?: {
                        id: ID;
                      };
                      product?: {
                        featuredMedia?: {
                          alt?: string;
                          preview?: { image?: { url: string } };
                        };
                        usesSerialNumbers?: {
                          jsonValue: unknown;
                        } | null;
                      };
                    }[];
                  };
                } | null;
              },
              { id: ID }
            >(
              `#graphql
              query order($id: ID!) {
                order(id: $id) {
                  lineItems(first: 100) {
                    nodes {
                      id
                      name
                      quantity
                      sku
                      variant {
                        id
                      }
                      product {
                        featuredMedia {
                          alt
                          preview {
                            image {
                              url(transform: { maxHeight: 50, maxWidth: 50 })
                            }
                          }
                        }
                        usesSerialNumbers: metafield(key: "serial-numbers", namespace: "$app") {
                          jsonValue
                        }
                      }
                    }
                  }
                }
              }
              `,
              { variables: { id } },
            );

            const [error] = result.errors ?? [];

            if (error) {
              throw new Error(error.message);
            }

            if (!result.data?.order) {
              throw new Error('Order not found');
            }

            return result.data.order;
          },
  });
}

function LineItemSerialInput({
  orderId,
  lineItemId,
  selectedSerials,
  onSelect,
}: {
  orderId: ID;
  lineItemId: ID;
  selectedSerials: Record<ID, Record<number, string>>;
  onSelect: (index: number, value: string | undefined) => void;
}) {
  const orderQuery = useOrderQuery(orderId);
  const order = orderQuery.data;
  const lineItem = order?.lineItems.nodes.find(lineItem => lineItem.id === lineItemId);

  const serialsQuery = useSerialsQuery({
    fetch,
    params: {
      sold: false,
      productVariantId: lineItem?.variant?.id,
      limit: 100,
      sort: 'product-name',
      order: 'ascending',
    },
    options: {
      enabled: !!lineItem?.variant?.id,
    },
  });

  useEffect(() => {
    if (!serialsQuery.isFetching && serialsQuery.hasNextPage) {
      serialsQuery.fetchNextPage();
    }
  }, [serialsQuery.isFetching, serialsQuery.hasNextPage]);

  const serials = serialsQuery.data?.pages.flat() ?? [];

  if (!order || !lineItem) {
    return <ProgressIndicator size="base" />;
  }

  const productVariantId = lineItem.variant?.id;
  const productVariantLineItems = order.lineItems.nodes.filter(lineItem => lineItem.variant?.id === productVariantId);
  const productVariantUsedSerials = productVariantLineItems.flatMap(lineItem =>
    Object.values(selectedSerials[lineItem.id] ?? {}),
  );

  return (
    <InlineStack inlineAlignment="space-between" blockAlignment="center" gap="base">
      <InlineStack gap="base" blockAlignment="center">
        {!!lineItem.product?.featuredMedia?.preview?.image?.url && (
          <Image
            alt={lineItem.product.featuredMedia.alt ?? lineItem.name}
            source={lineItem.product.featuredMedia.preview.image.url}
          />
        )}
        <BlockStack>
          <Heading>{lineItem.name}</Heading>
          {!!lineItem.sku && <Text>SKU: {lineItem.sku}</Text>}
        </BlockStack>
      </InlineStack>
      {/*TODO: In mutation , assert that serial number is not used multiple times*/}
      <BlockStack>
        {Array.from({ length: lineItem.quantity }).map((_, i) => (
          <Select
            key={selectedSerials[lineItemId]?.[i] ?? i}
            label=""
            onChange={serial => onSelect(i, serial || undefined)}
            value={selectedSerials[lineItemId]?.[i] ?? ''}
            options={[
              {
                label: 'No serial number',
                value: '',
              },
              ...(selectedSerials[lineItemId]?.[i]
                ? [
                    {
                      label: selectedSerials[lineItemId][i],
                      value: selectedSerials[lineItemId][i],
                    },
                  ]
                : []),
              ...serials
                .filter(serial => serial.serial !== selectedSerials[lineItemId]?.[i])
                .map(serial => ({
                  label: serial.serial,
                  value: serial.serial,
                  disabled:
                    selectedSerials[lineItemId]?.[i] !== serial.serial &&
                    productVariantUsedSerials.includes(serial.serial),
                })),
            ]}
          />
        ))}
      </BlockStack>
    </InlineStack>
  );
}

function removeUndefinedValues<T extends {}>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T;
}

function removeEmptyObjects<T extends Record<string, {}>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => Object.keys(value).length !== 0)) as T;
}
