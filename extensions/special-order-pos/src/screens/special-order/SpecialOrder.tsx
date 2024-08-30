import { Dispatch, SetStateAction, useState } from 'react';
import { WIPCreateSpecialOrder } from '../../create-special-order/default.js';
import { CreateSpecialOrder, DateTime } from '@web/schemas/generated/create-special-order.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useSpecialOrderQuery } from '@work-orders/common/queries/use-special-order-query.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useCustomerQuery } from '@work-orders/common/queries/use-customer-query.js';
import { useCompanyQuery } from '@work-orders/common/queries/use-company-query.js';
import { useCompanyLocationQuery } from '@work-orders/common/queries/use-company-location-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useSpecialOrderMutation } from '@work-orders/common/queries/use-special-order-mutation.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import {
  Banner,
  DatePicker,
  List,
  ListRow,
  ScrollView,
  Text,
  useExtensionApi,
} from '@shopify/retail-ui-extensions-react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { FormStringField } from '@teifi-digital/pos-tools/form/components/FormStringField.js';
import { useRouter } from '../../routes.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { SHOPIFY_B2B_PLANS } from '@work-orders/common/util/shopify-plans.js';
import { useStorePropertiesQuery } from '@work-orders/common/queries/use-store-properties-query.js';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { useForm } from '@teifi-digital/pos-tools/form';
import { FormButton } from '@teifi-digital/pos-tools/form/components/FormButton.js';
import { getCreateSpecialOrderFromDetailedSpecialOrder } from '../../create-special-order/get-create-special-order-from-detailed-special-order.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getSpecialOrderLineItemBadges } from './SpecialOrderLineItemConfig.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';

export function SpecialOrder({ initial }: { initial: WIPCreateSpecialOrder }) {
  const [lastSavedSpecialOrder, setLastSavedSpecialOrder] = useState(initial);
  const [createSpecialOrder, setCreateSpecialOrder] = useState(initial);

  const hasUnsavedChanges = JSON.stringify(createSpecialOrder) !== JSON.stringify(lastSavedSpecialOrder);

  const setCompanyId = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'companyId');
  const setCompanyContactId = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'companyContactId');
  const setCompanyLocationId = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'companyLocationId');
  const setLocationId = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'locationId');
  const setNote = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'note');
  const setRequiredBy = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'requiredBy');
  const setCustomerId = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'customerId');

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const fetch = useAuthenticatedFetch();
  const specialOrderQuery = useSpecialOrderQuery({ fetch, name: createSpecialOrder.name });
  const storePropertiesQuery = useStorePropertiesQuery({ fetch });
  const locationQuery = useLocationQuery({ fetch, id: createSpecialOrder.locationId });
  const customerQuery = useCustomerQuery({ fetch, id: createSpecialOrder.customerId });
  const companyQuery = useCompanyQuery({ fetch, id: createSpecialOrder.companyId });
  const companyLocationQuery = useCompanyLocationQuery({ fetch, id: createSpecialOrder.companyLocationId });

  const specialOrderMutation = useSpecialOrderMutation({ fetch });

  const screen = useScreen();
  screen.setTitle(createSpecialOrder.name ?? 'New Special Order');
  screen.setIsLoading(specialOrderQuery.isFetching || storePropertiesQuery.isLoading);

  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });
  screen.addOverrideNavigateBack(unsavedChangesDialog.show);

  const bannerQueries = {
    specialOrderQuery,
    storePropertiesQuery,
    locationQuery,
    customerQuery,
    companyQuery,
    companyLocationQuery,
  };

  const router = useRouter();

  const openCompanySelector = () =>
    router.push('CompanySelector', {
      onSelect: company => {
        setCompanyId(company.id);
        setCompanyContactId(company.mainContact?.id ?? null);
        setCustomerId(company.mainContact?.customer.id ?? null);
        openCompanyLocationSelector(company.id);
      },
      onClear: () => {
        setCompanyId(null);
        setCompanyContactId(null);
        setCustomerId(null);
        setCompanyLocationId(null);
      },
    });

  const openCompanyLocationSelector = (companyId: ID) =>
    router.push('CompanyLocationSelector', {
      companyId,
      onSelect: companyLocation => setCompanyLocationId(companyLocation.id),
      onClear: () => setCompanyLocationId(null),
    });

  const openCustomerSelector = () =>
    router.push('CustomerSelector', {
      onSelect: customer => setCustomerId(customer.id),
    });

  const openLocationSelector = () =>
    router.push('LocationSelector', {
      onSelect: location => setLocationId(location.id),
    });

  const { toast } = useExtensionApi<'pos.home.modal.render'>();

  const canSelectCompany =
    storePropertiesQuery.data && SHOPIFY_B2B_PLANS.includes(storePropertiesQuery.data?.storeProperties.plan);

  const { Form } = useForm();

  const rows = useListRows(createSpecialOrder, setCreateSpecialOrder);

  return (
    <Form>
      <ScrollView>
        <ResponsiveGrid columns={1} spacing={2}>
          {Object.entries(bannerQueries).map(([key, query]) => {
            if (!query.isError) {
              return null;
            }

            const resource = titleCase(key.replace('Query', ''));
            return (
              <Banner
                key={key}
                title={`Error fetching ${resource.toLowerCase()}: ${extractErrorMessage(query.error, 'unknown error')}`}
                variant={'error'}
                visible
                action={'Retry'}
                onAction={() => query.refetch()}
              />
            );
          })}

          {createSpecialOrder.name && <Text variant={'headingLarge'}>{createSpecialOrder.name}</Text>}

          <ResponsiveGrid columns={4}>
            {canSelectCompany && (
              <FormStringField
                label={'Company'}
                onFocus={() => openCompanySelector()}
                value={
                  createSpecialOrder.companyId === null
                    ? ''
                    : companyQuery.isLoading
                      ? 'Loading...'
                      : companyQuery.data?.name ?? 'Unknown company'
                }
              />
            )}

            {createSpecialOrder.companyId && (
              <FormStringField
                label={'Company Location'}
                onFocus={() => {
                  if (!createSpecialOrder.companyId) {
                    toast.show('You must select a company to select a company location');
                    return;
                  }

                  openCompanyLocationSelector(createSpecialOrder.companyId);
                }}
                value={
                  !createSpecialOrder.companyLocationId
                    ? ''
                    : companyLocationQuery.isLoading
                      ? 'Loading...'
                      : companyLocationQuery.data?.name ?? 'Unknown location'
                }
                required={!!createSpecialOrder.companyId}
              />
            )}

            <FormStringField
              label={'Customer'}
              value={
                !createSpecialOrder.customerId
                  ? ''
                  : customerQuery.isLoading
                    ? 'Loading...'
                    : customerQuery.data?.displayName ?? 'Unknown customer'
              }
              disabled={!!createSpecialOrder.companyId}
              onFocus={() => openCustomerSelector()}
              required
            />

            <FormStringField
              label={'Location'}
              value={locationQuery.isLoading ? 'Loading...' : locationQuery.data?.name ?? 'Unknown location'}
              onFocus={() => openLocationSelector()}
              required
            />

            <DatePicker
              inputMode={'spinner'}
              visibleState={[isDatePickerOpen, setIsDatePickerOpen]}
              onChange={(date: string) => setRequiredBy(new Date(date).toISOString() as DateTime)}
            />

            <FormStringField
              label={'Required By'}
              value={
                createSpecialOrder.requiredBy ? new Date(createSpecialOrder.requiredBy).toLocaleDateString() : undefined
              }
              onFocus={() => setIsDatePickerOpen(true)}
              action={
                !!createSpecialOrder.requiredBy
                  ? {
                      label: 'Clear',
                      onPress: () => setRequiredBy(null),
                    }
                  : undefined
              }
            />

            <FormStringField label={'Note'} value={createSpecialOrder.note} onChange={setNote} type={'area'} />
          </ResponsiveGrid>

          <List data={rows} imageDisplayStrategy={'always'} />

          {rows.length === 0 && (
            <ResponsiveStack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
              <Text variant="body" color="TextSubdued">
                No items added to special order
              </Text>
            </ResponsiveStack>
          )}
        </ResponsiveGrid>
      </ScrollView>

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
            onPress={() =>
              specialOrderMutation.mutate(createSpecialOrder as CreateSpecialOrder, {
                onSuccess(specialOrder) {
                  const createSpecialOrder = getCreateSpecialOrderFromDetailedSpecialOrder(specialOrder);
                  setLastSavedSpecialOrder(createSpecialOrder);
                  setCreateSpecialOrder(createSpecialOrder);
                  toast.show(`Saved special order ${specialOrder.name}`);
                },
              })
            }
          />
        </ResponsiveGrid>
      </ResponsiveStack>
    </Form>
  );
}

function getCreateSpecialOrderSetter<K extends keyof WIPCreateSpecialOrder>(
  setCreateSpecialOrder: Dispatch<SetStateAction<WIPCreateSpecialOrder>>,
  key: K,
): Dispatch<SetStateAction<WIPCreateSpecialOrder[K]>> {
  return arg => {
    if (typeof arg === 'function') {
      setCreateSpecialOrder(current => ({ ...current, [key]: arg(current[key]) }));
    } else {
      setCreateSpecialOrder(current => ({ ...current, [key]: arg }));
    }
  };
}

function useListRows(
  createSpecialOrder: WIPCreateSpecialOrder,
  setCreateSpecialOrder: Dispatch<SetStateAction<WIPCreateSpecialOrder>>,
) {
  const { name, lineItems } = createSpecialOrder;

  const setLineItems = getCreateSpecialOrderSetter(setCreateSpecialOrder, 'lineItems');

  const fetch = useAuthenticatedFetch();
  const specialOrderQuery = useSpecialOrderQuery({ fetch, name });
  const productVariantIds = unique(lineItems.map(li => li.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const specialOrder = specialOrderQuery.data;

  const screen = useScreen();
  screen.setIsLoading(specialOrderQuery.isFetching);

  const router = useRouter();

  return lineItems.map<ListRow>(lineItem => {
    const productVariantQuery = productVariantQueries[lineItem.productVariantId];
    const productVariant = productVariantQuery?.data;

    const label = productVariantQuery?.isLoading
      ? 'Loading...'
      : getProductVariantName(productVariant) ?? 'Unknown product';

    const specialOrderLineItem = specialOrder?.lineItems.find(hasPropertyValue('uuid', lineItem.uuid));

    return {
      id: lineItem.uuid,
      onPress: () => {
        router.push('SpecialOrderLineItemConfig', {
          name: createSpecialOrder.name,
          lineItem,
          onChange: lineItem =>
            setLineItems(current =>
              current.map(currentLineItem => (currentLineItem.uuid === lineItem.uuid ? lineItem : currentLineItem)),
            ),
          onRemove: () =>
            setLineItems(current => current.filter(currentLineItem => currentLineItem.uuid !== lineItem.uuid)),
        });
      },
      leftSide: {
        label,
        image: {
          source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
          badge: lineItem.quantity,
        },
        badges:
          specialOrder && specialOrderLineItem ? getSpecialOrderLineItemBadges(specialOrder, specialOrderLineItem) : [],
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}
