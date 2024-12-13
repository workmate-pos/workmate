import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  FormLayout,
  Frame,
  InlineStack,
  Page,
  ResourceItem,
  ResourceList,
  SkeletonThumbnail,
  Text,
  TextField,
  Thumbnail,
} from '@shopify/polaris';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useSerialQuery } from '@work-orders/common/queries/use-serial-query.js';
import { createGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getDefaultCreateSerial } from '@work-orders/common/create-serial/default.js';
import { getCreateSerialSetter } from '@work-orders/common/create-serial/get-create-serial-setter.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { getCreateSerialFromDetailedSerial } from '@work-orders/common/create-serial/get-create-serial-from-detailed-serial.js';
import { useSerialMutation } from '@work-orders/common/queries/use-serial-mutation.js';
import { ContextualSaveBar, useAppBridge } from '@shopify/app-bridge-react';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { LocationSelectorModal } from '@web/frontend/components/shared-orders/modals/LocationSelectorModal.js';
import { CreateSerial } from '@web/schemas/generated/create-serial.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { LinkedTasks, NewLinkedTaskButton } from '@web/frontend/components/tasks/LinkedTasks.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { Action } from '@shopify/app-bridge-core/actions/Navigation/Redirect/index.js';

export default function Serial() {
  const routes = useParams<'productVariantId' | 'serial'>();

  const productVariantId = createGid('ProductVariant', routes.productVariantId ?? '0');

  const [lastSavedSerial, setLastSavedSerial] = useState(() => ({
    ...getDefaultCreateSerial(productVariantId),
    serial: routes.serial === 'new' ? null : routes.serial!,
  }));
  const [createSerial, setCreateSerial] = useState(() => ({
    ...getDefaultCreateSerial(productVariantId),
    serial: routes.serial === 'new' ? null : routes.serial!,
  }));

  const setSerialNumber = getCreateSerialSetter(setCreateSerial, 'serial');
  const setLocationId = getCreateSerialSetter(setCreateSerial, 'locationId');
  const setNote = getCreateSerialSetter(setCreateSerial, 'note');
  const setSold = getCreateSerialSetter(setCreateSerial, 'sold');

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId });
  const locationQuery = useLocationQuery({ fetch, id: createSerial.locationId });
  const serialQuery = useSerialQuery({ fetch, productVariantId, serial: createSerial.serial });
  const serialMutation = useSerialMutation({ fetch });

  useEffect(() => {
    if (serialQuery.isSuccess && routes.serial !== 'new' && serialQuery.data) {
      const createSerial = getCreateSerialFromDetailedSerial(serialQuery.data);
      setLastSavedSerial(createSerial);
      setCreateSerial(createSerial);
    }
  }, [serialQuery.isSuccess, serialQuery.data, routes.serial]);

  const productVariant = productVariantQuery.data;
  const location = locationQuery.data;
  const serial = serialQuery.data;

  const hasUnsavedChanges =
    JSON.stringify(createSerial, Object.keys(createSerial).sort()) !==
    JSON.stringify(lastSavedSerial, Object.keys(lastSavedSerial).sort());
  const isSerialNumberInUse = !lastSavedSerial.serial && !!serial;

  const disabled = serialMutation.isPending;
  const app = useAppBridge();

  const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;
  const label = getProductVariantName(productVariant ?? serial?.productVariant) ?? 'Unknown product';

  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);

  const save = () =>
    serialMutation.mutate(createSerial as CreateSerial, {
      onSuccess(serial) {
        if (!serial) return;
        setToastAction({ content: 'Saved serial' });
        const createSerial = getCreateSerialFromDetailedSerial(serial);
        setLastSavedSerial(createSerial);
        setCreateSerial(createSerial);
        Redirect.create(app).dispatch(
          Redirect.Action.APP,
          `/serial/${parseGid(serial.productVariant.id).id}/${encodeURIComponent(serial.serial)}`,
        );
      },
    });

  if (!routes.productVariantId?.length || !/^\d+$/.test(routes.productVariantId)) {
    return (
      <Frame>
        <Page>
          <BlockStack>
            <Text variant="headingMd" tone="critical" as="h1">
              Invalid Product Variant ID
            </Text>
          </BlockStack>
        </Page>
      </Frame>
    );
  }

  if (!routes.serial?.length) {
    return (
      <Frame>
        <Page>
          <BlockStack>
            <Text variant="headingMd" tone="critical" as="h1">
              Invalid Serial
            </Text>
          </BlockStack>
        </Page>
      </Frame>
    );
  }

  if (routes.serial !== 'new' && serialQuery.isSuccess && !serialQuery.data) {
    return (
      <Frame>
        <Page>
          <Card>
            <Box paddingBlock={'1600'}>
              <BlockStack align="center" inlineAlign="center">
                <Text variant="headingLg" tone="critical" as="h1">
                  Serial not found
                </Text>
              </BlockStack>
            </Box>
          </Card>
        </Page>
      </Frame>
    );
  }

  return (
    <Frame>
      <Page>
        <ContextualSaveBar
          visible={hasUnsavedChanges}
          saveAction={{
            onAction: save,
            loading: serialMutation.isPending,
          }}
          discardAction={{
            onAction: () => setCreateSerial(lastSavedSerial),
          }}
        />

        <Card>
          <BlockStack gap={'800'}>
            {productVariantQuery.isError && (
              <Banner title="Error loading product variant" tone="critical">
                {extractErrorMessage(productVariantQuery.error, 'Unknown error')}
              </Banner>
            )}

            {serialQuery.isError && (
              <Banner title="Error loading serial" tone="critical">
                {extractErrorMessage(serialQuery.error, 'Unknown error')}
              </Banner>
            )}

            {locationQuery.isError && (
              <Banner title="Error loading location" tone="critical">
                {extractErrorMessage(locationQuery.error, 'Unknown error')}
              </Banner>
            )}

            <InlineStack gap={'400'}>
              {imageUrl && <Thumbnail source={imageUrl} alt={label} />}
              {!imageUrl && <SkeletonThumbnail />}
              <BlockStack align="center">
                <Text as="h1" variant="headingMd" fontWeight="bold">
                  {label}
                </Text>
              </BlockStack>
            </InlineStack>

            <FormLayout>
              <TextField
                label={'Serial number'}
                value={createSerial.serial ?? ''}
                requiredIndicator
                onChange={serialNumber => setSerialNumber(serialNumber.toUpperCase() || null)}
                disabled={disabled || !!lastSavedSerial.serial}
                autoComplete="off"
                error={isSerialNumberInUse ? 'Serial number is already in use' : undefined}
              />

              <LocationSelectorModal
                open={isLocationSelectorOpen}
                onClose={() => setIsLocationSelectorOpen(false)}
                onSelect={locationId => setLocationId(locationId)}
              />

              <TextField
                disabled={disabled}
                label={'Location'}
                requiredIndicator
                labelAction={
                  createSerial.locationId !== null
                    ? {
                        content: 'Remove',
                        onAction: () => setLocationId(null),
                      }
                    : undefined
                }
                autoComplete="off"
                value={
                  createSerial.locationId === null
                    ? ''
                    : locationQuery.isLoading
                      ? 'Loading...'
                      : (location?.name ?? 'Unknown location')
                }
                onFocus={() => setIsLocationSelectorOpen(true)}
              />

              <TextField
                disabled={disabled}
                label={'Note'}
                autoComplete="off"
                value={createSerial.note}
                multiline={2}
                onChange={setNote}
              />

              <Checkbox
                label="Sold"
                disabled={disabled}
                checked={createSerial.sold}
                onChange={setSold}
                helpText="If checked, the serial will not be accounted for in available inventory quantity"
              />

              <ButtonGroup fullWidth>
                <Button
                  disabled={disabled || isSerialNumberInUse || !createSerial.serial || serialQuery.isFetching}
                  loading={serialMutation.isPending}
                  onClick={() => save()}
                >
                  Save
                </Button>
              </ButtonGroup>
            </FormLayout>

            {serial && (
              <BlockStack gap={'1000'}>
                <LinkedTasks
                  links={{ serials: [serial.serial] }}
                  disabled={serialMutation.isPending}
                  action={tasks => (
                    <NewLinkedTaskButton
                      links={{ serials: [serial.serial] }}
                      suggestedDeadlines={tasks.map(task => task.deadline).filter(isNonNullable)}
                    />
                  )}
                />

                <BlockStack gap={'200'}>
                  <Text as="h2" variant="headingMd" fontWeight="bold">
                    Order History
                  </Text>

                  <ResourceList
                    items={serial.history}
                    emptyState={
                      <Text as={'p'} variant={'bodyMd'} tone={'subdued'}>
                        This serial does not have any associated orders
                      </Text>
                    }
                    renderItem={item => {
                      const id = `${item.type}-${item.name}`;

                      if (item.type === 'purchase-order') {
                        return (
                          <ResourceItem url={`/purchase-orders/${encodeURIComponent(item.name)}`} id={id}>
                            <BlockStack gap={'400'}>
                              <Text as="p" variant="headingSm" fontWeight="bold">
                                {item.name}
                              </Text>
                              <BlockStack gap={'200'}>
                                {item.location && (
                                  <Text as="p" variant="bodyMd" tone="subdued">
                                    {item.location?.name}
                                  </Text>
                                )}
                              </BlockStack>
                            </BlockStack>
                          </ResourceItem>
                        );
                      }

                      if (item.type === 'work-order') {
                        return (
                          <ResourceItem url={`/work-orders/${encodeURIComponent(item.name)}`} id={id}>
                            <BlockStack gap={'400'}>
                              <Text as="p" variant="headingSm" fontWeight="bold">
                                {item.name}
                              </Text>
                              <BlockStack gap={'200'}>
                                {item.location && (
                                  <Text as="p" variant="bodyMd" tone="subdued">
                                    {item.location?.name}
                                  </Text>
                                )}
                                <Text as="p" variant="bodyMd" tone="subdued">
                                  {item.customer.displayName}
                                </Text>
                              </BlockStack>
                            </BlockStack>
                          </ResourceItem>
                        );
                      }

                      if (item.type === 'shopify-order') {
                        return (
                          <ResourceItem
                            id={id}
                            onClick={() =>
                              Redirect.create(app).dispatch(
                                Action.ADMIN_PATH,
                                `/${
                                  { ORDER: 'orders', DRAFT_ORDER: 'draft_orders' }[item.orderType]
                                }/${parseGid(item.id).id}`,
                              )
                            }
                          >
                            <BlockStack gap={'400'}>
                              <Text as="p" variant="headingSm" fontWeight="bold">
                                {item.name}
                              </Text>
                              {item.customer && (
                                <BlockStack gap={'200'}>
                                  <Text as="p" variant="bodyMd" tone="subdued">
                                    {item.customer.displayName}
                                  </Text>
                                </BlockStack>
                              )}
                            </BlockStack>
                          </ResourceItem>
                        );
                      }

                      return item satisfies never;
                    }}
                  />
                </BlockStack>
              </BlockStack>
            )}
          </BlockStack>
        </Card>

        {toast}
      </Page>
    </Frame>
  );
}
