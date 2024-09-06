import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
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
import { useState } from 'react';
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

export default function Serial() {
  const routes = useParams<'productVariantId' | 'serial'>();

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

  const productVariantId = createGid('ProductVariant', routes.productVariantId);

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

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const productVariantQuery = useProductVariantQuery({ fetch, id: productVariantId });
  const locationQuery = useLocationQuery({ fetch, id: createSerial.locationId });
  const serialQuery = useSerialQuery(
    { fetch, productVariantId, serial: createSerial.serial },
    {
      onSuccess(serial) {
        if (routes.serial !== 'new' && serial) {
          const createSerial = getCreateSerialFromDetailedSerial(serial);
          setLastSavedSerial(createSerial);
          setCreateSerial(createSerial);
        }
      },
    },
  );
  const serialMutation = useSerialMutation({ fetch });

  const productVariant = productVariantQuery.data;
  const location = locationQuery.data;
  const serial = serialQuery.data;

  const hasUnsavedChanges = JSON.stringify(createSerial) !== JSON.stringify(lastSavedSerial);
  const isSerialNumberInUse = !lastSavedSerial.serial && !!serial;

  const disabled = serialMutation.isLoading;
  const app = useAppBridge();

  const imageUrl = productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url;
  const label = getProductVariantName(productVariant ?? serial?.productVariant) ?? 'Unknown Product';

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

  return (
    <Frame>
      <Page>
        <ContextualSaveBar
          visible={hasUnsavedChanges}
          saveAction={{
            onAction: save,
            loading: serialMutation.isLoading,
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
                label={'Serial Number'}
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
                setToastAction={setToastAction}
              />

              <TextField
                disabled={disabled}
                label={'Location'}
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
                      : location?.name ?? 'Unknown location'
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

              <ButtonGroup fullWidth>
                <Button
                  disabled={disabled || isSerialNumberInUse || !createSerial.serial || serialQuery.isFetching}
                  loading={serialMutation.isLoading}
                  onClick={() => save()}
                >
                  Save
                </Button>
              </ButtonGroup>
            </FormLayout>

            {serial && (
              <ResourceList
                items={serial.history}
                renderItem={item => {
                  const id = `${item.type}-${item.name}`;

                  if (item.type === 'purchase-order') {
                    return (
                      <ResourceItem url={`/purchase-orders/${encodeURIComponent(item.name)}`} id={id}>
                        <BlockStack gap={'400'}>
                          <Box>
                            <Badge tone="info">{item.name}</Badge>
                          </Box>
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
                          <Box>
                            <Badge tone="info">{item.name}</Badge>
                          </Box>
                          <BlockStack gap={'200'}>
                            <Text as="p" variant="bodyMd" tone="subdued">
                              {item.customer.displayName}
                            </Text>
                          </BlockStack>
                        </BlockStack>
                      </ResourceItem>
                    );
                  }

                  return item satisfies never;
                }}
              />
            )}
          </BlockStack>
        </Card>

        {toast}
      </Page>
    </Frame>
  );
}
