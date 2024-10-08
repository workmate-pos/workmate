import { useState } from 'react';
import { Banner, Image, List, ListRow, ScrollView, Text, useApi } from '@shopify/ui-extensions-react/point-of-sale';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useProductVariantQuery } from '@work-orders/common/queries/use-product-variant-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useRouter } from '../../routes.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { useSerialMutation } from '@work-orders/common/queries/use-serial-mutation.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { CreateSerial } from '@web/schemas/generated/create-serial.js';
import { useSerialQuery } from '@work-orders/common/queries/use-serial-query.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { WIPCreateSerial } from '@work-orders/common/create-serial/default.js';
import { getCreateSerialSetter } from '@work-orders/common/create-serial/get-create-serial-setter.js';
import { getCreateSerialFromDetailedSerial } from '@work-orders/common/create-serial/get-create-serial-from-detailed-serial.js';

export function Serial({ initial }: { initial: WIPCreateSerial }) {
  const [lastSavedSerial, setLastSavedSerial] = useState(initial);
  const [createSerial, setCreateSerial] = useState(initial);

  const setSerialNumber = getCreateSerialSetter(setCreateSerial, 'serial');
  const setLocationId = getCreateSerialSetter(setCreateSerial, 'locationId');
  const setNote = getCreateSerialSetter(setCreateSerial, 'note');

  const fetch = useAuthenticatedFetch();
  const productVariantQuery = useProductVariantQuery({ fetch, id: createSerial.productVariantId });
  const locationQuery = useLocationQuery({ fetch, id: createSerial.locationId });
  const serialMutation = useSerialMutation({ fetch });
  const serialQuery = useSerialQuery({
    fetch,
    serial: createSerial.serial,
    productVariantId: createSerial.productVariantId,
  });

  const productVariant = productVariantQuery.data;
  const location = locationQuery.data;
  const serial = serialQuery.data;

  const disabled = serialMutation.isPending;

  const router = useRouter();

  const screen = useScreen();
  const title = [createSerial.serial, getProductVariantName(productVariant) ?? 'loading...']
    .filter(Boolean)
    .join(' - ');
  screen.setTitle(title || 'New Serial');

  const hasUnsavedChanges =
    JSON.stringify(createSerial, Object.keys(createSerial).sort()) !==
    JSON.stringify(lastSavedSerial, Object.keys(lastSavedSerial).sort());
  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  const { toast } = useApi<'pos.home.modal.render'>();

  const isSerialNumberInUse = !lastSavedSerial.serial && !!serial;

  return (
    <Form disabled={disabled}>
      <ScrollView>
        {productVariantQuery.isError && (
          <Banner
            title={`Error loading product: ${extractErrorMessage(productVariantQuery.error, 'unknown error')}`}
            variant={'error'}
            visible
            action={'Retry'}
            onPress={() => productVariantQuery.refetch()}
          />
        )}

        {productVariant && (
          <ResponsiveStack direction={'horizontal'} paddingVertical={'Medium'} spacing={2} flex={1}>
            <Image src={productVariant.image?.url ?? productVariant.product.featuredImage?.url} />
            <Text variant={'headingLarge'}>{getProductVariantName(productVariant) ?? 'Unknown product'}</Text>
          </ResponsiveStack>
        )}

        <ResponsiveGrid columns={4}>
          <ResponsiveStack direction={'vertical'} spacing={0.5}>
            <FormStringField
              label={'Serial Number'}
              value={createSerial.serial || undefined}
              required
              onChange={serial => setSerialNumber(serial.toUpperCase())}
              disabled={!!lastSavedSerial.serial}
            />
            {isSerialNumberInUse && (
              <Text color={'TextCritical'} variant={'body'}>
                Serial number is already in use
              </Text>
            )}
          </ResponsiveStack>

          <FormStringField
            label={'Location'}
            value={
              createSerial.locationId
                ? locationQuery.isLoading
                  ? 'Loading...'
                  : (location?.name ?? 'Unknown location')
                : ''
            }
            required
            onFocus={() =>
              router.push('LocationSelector', {
                onSelect: location => setLocationId(location.id),
                onClear: () => setLocationId(null),
              })
            }
          />

          <FormStringField type={'area'} label={'Note'} value={createSerial.note} onChange={setNote} />
        </ResponsiveGrid>

        <List
          imageDisplayStrategy={'never'}
          data={
            serial
              ? serial.history.map<ListRow>(history => ({
                  id: `${history.type}-${history.name}`,
                  onPress: () => {
                    if (history.type === 'purchase-order') {
                      router.push('PurchaseOrderLoader', { name: history.name });
                      return;
                    }

                    if (history.type === 'work-order') {
                      router.push('WorkOrderLoader', { name: history.name });
                      return;
                    }

                    return history satisfies never;
                  },
                  leftSide: {
                    label: history.name,
                    subtitle: getSubtitle([new Date(history.date).toLocaleDateString()]),
                    badges: [
                      { variant: 'highlight', text: history.status } as const,

                      history.type === 'purchase-order' && history.location
                        ? ({
                            variant: 'neutral',
                            text: history.location.name,
                          } as const)
                        : null,

                      history.type === 'work-order'
                        ? ({
                            variant: 'neutral',
                            text: history.customer.displayName,
                          } as const)
                        : null,
                    ].filter(isNonNullable),
                  },
                  rightSide: {
                    showChevron: true,
                  },
                }))
              : []
          }
        />

        <ResponsiveStack
          direction={'vertical'}
          spacing={0.5}
          paddingVertical={'HalfPoint'}
          paddingHorizontal={'HalfPoint'}
          flex={0}
        >
          <ResponsiveGrid columns={4} smColumns={2} grow flex={0}>
            <FormButton
              title={'Save'}
              type={'primary'}
              action={'submit'}
              disabled={serialQuery.isLoading || isSerialNumberInUse}
              loading={serialMutation.isPending}
              onPress={() =>
                serialMutation.mutate(createSerial as CreateSerial, {
                  onSuccess(specialOrder) {
                    const createSerial = getCreateSerialFromDetailedSerial(specialOrder);
                    setLastSavedSerial(createSerial);
                    setCreateSerial(createSerial);
                    toast.show(`Saved serial ${specialOrder.serial}`);
                  },
                })
              }
            />
          </ResponsiveGrid>
        </ResponsiveStack>
      </ScrollView>
    </Form>
  );
}
