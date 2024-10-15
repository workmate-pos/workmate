import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { FormStringField } from '@teifi-digital/pos-tools/components/form/FormStringField.js';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import {
  Badge,
  Banner,
  Button,
  DatePicker,
  List,
  ListRow,
  ScrollView,
  Stack,
  Text,
  useApi,
} from '@shopify/ui-extensions-react/point-of-sale';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { ProductScanner } from '../components/ProductScanner.js';
import { Dispatch, SetStateAction, useState } from 'react';
import { useProductVariantQueries } from '@work-orders/common/queries/use-product-variant-query.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { useRouter } from '../routes.js';
import { useCycleCountMutation } from '@work-orders/common/queries/use-cycle-count-mutation.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { CreateCycleCount } from '@web/schemas/generated/create-cycle-count.js';
import { getCreateCycleCountFromDetailedCycleCount } from '../create-cycle-count/get-create-cycle-count-from-detailed-cycle-count.js';
import { DetailedCycleCount } from '@web/services/cycle-count/types.js';
import { useCycleCountQuery } from '@work-orders/common/queries/use-cycle-count-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { uuid } from '@work-orders/common/util/uuid.js';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { getCycleCountApplicationStateBadge } from './Entry.js';
import { hasPropertyValue } from '@teifi-digital/shopify-app-toolbox/guards';
import { useEmployeeQueries } from '@work-orders/common/queries/use-employee-query.js';
import { DateTime } from '@web/schemas/generated/create-work-order.js';
import { createGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { getSubtitle } from '@work-orders/common-pos/util/subtitle.js';

export function CycleCount({ initial }: { initial: CreateCycleCount }) {
  const { toast, session } = useApi<'pos.home.modal.render'>();

  const [lastSavedCreateCycleCount, setLastSavedCreateCycleCount] = useState(initial);
  const [createCycleCount, setCreateCycleCount] = useState(initial);
  const setStatus = getCreateCycleCountSetter(setCreateCycleCount, 'status');
  const setLocationId = getCreateCycleCountSetter(setCreateCycleCount, 'locationId');
  const setDueDate = getCreateCycleCountSetter(setCreateCycleCount, 'dueDate');
  const setNote = getCreateCycleCountSetter(setCreateCycleCount, 'note');
  const setItems = getCreateCycleCountSetter(setCreateCycleCount, 'items');
  const setEmployeeAssignments = getCreateCycleCountSetter(setCreateCycleCount, 'employeeAssignments');
  const setLocked = getCreateCycleCountSetter(setCreateCycleCount, 'locked');

  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const hasUnsavedChanges =
    JSON.stringify(createCycleCount, Object.keys(createCycleCount).sort()) !==
    JSON.stringify(lastSavedCreateCycleCount, Object.keys(lastSavedCreateCycleCount).sort());

  const fetch = useAuthenticatedFetch();
  const cycleCountQuery = useCycleCountQuery({ fetch, name: createCycleCount.name });
  const locationQuery = useLocationQuery({ fetch, id: createCycleCount.locationId });

  const currentEmployeeId = createGid(
    'StaffMember',
    session.currentSession.staffMemberId ?? session.currentSession.userId,
  );
  const employeeIds = unique([
    currentEmployeeId,
    ...createCycleCount.employeeAssignments.map(assignment => assignment.employeeId),
  ]);
  const employeeQueries = useEmployeeQueries({ fetch, ids: employeeIds });

  const onMutateSuccess = (message: string) => (cycleCount: DetailedCycleCount) => {
    const createCycleCount = getCreateCycleCountFromDetailedCycleCount(cycleCount);
    setLastSavedCreateCycleCount(createCycleCount);
    setCreateCycleCount(createCycleCount);
    toast.show(message);
  };

  const cycleCountMutation = useCycleCountMutation({ fetch });

  const locationName = locationQuery.isLoading ? 'Loading...' : (locationQuery.data?.name ?? 'Unknown location');

  const isSuperuser = employeeQueries[currentEmployeeId]?.data?.superuser;
  const isImmutable = createCycleCount.locked;

  const rows = useItemRows({ createCycleCount, setCreateCycleCount }).map(row => ({
    ...row,
    onPress: () => {
      if (isImmutable) {
        return;
      }

      row.onPress?.();
    },
    rightSide: {
      ...row.rightSide,
      showChevron: !!row.rightSide?.showChevron && !isImmutable,
    },
  }));

  const router = useRouter();
  const screen = useScreen();
  screen.setIsLoading(cycleCountQuery.isLoading);

  return (
    <Form disabled={cycleCountMutation.isPending || isImmutable || !router.isCurrent}>
      <DatePicker
        inputMode={'spinner'}
        visibleState={[datePickerOpen, setDatePickerOpen]}
        onChange={(dueDate: string) => setDueDate(new Date(dueDate).toISOString() as DateTime)}
      />

      <ScrollView>
        <ResponsiveStack spacing={2} direction={'vertical'}>
          <Banner title={'This cycle count is locked'} variant={'alert'} visible={createCycleCount.locked} hideAction />

          {cycleCountMutation.isError && (
            <Banner
              visible
              variant={'error'}
              title={extractErrorMessage(
                cycleCountMutation.error,
                'An unknown error occurred while saving this cycle count',
              )}
            />
          )}

          {!!createCycleCount.name && (
            <ResponsiveStack direction={'horizontal'} alignment={'space-between'} flex={1}>
              <Text variant={'headingLarge'}>{createCycleCount.name}</Text>

              {cycleCountQuery.data && (
                <Badge {...getCycleCountApplicationStateBadge(cycleCountQuery.data.applicationStatus)} />
              )}
            </ResponsiveStack>
          )}

          <ResponsiveGrid columns={4} grow>
            <FormStringField
              label={'Status'}
              value={createCycleCount.status}
              required
              onFocus={() => router.push('StatusSelector', { onSelect: setStatus })}
            />

            <FormStringField
              label={'Location'}
              type={'normal'}
              value={locationName}
              disabled={
                !!createCycleCount.name &&
                createCycleCount.items.length > 0 &&
                cycleCountQuery.data?.applicationStatus !== 'NOT_APPLIED'
              }
              onFocus={() =>
                router.push('LocationSelector', {
                  onSelect: location => setLocationId(location.id),
                })
              }
            />

            <FormStringField
              label={'Due Date'}
              value={createCycleCount.dueDate ? new Date(createCycleCount.dueDate).toLocaleDateString() : undefined}
              onFocus={() => setDatePickerOpen(true)}
              action={
                !!createCycleCount.dueDate
                  ? {
                      label: 'Clear',
                      onPress: () => setDueDate(null),
                    }
                  : undefined
              }
              disabled={datePickerOpen}
            />
            <FormStringField label={'Note'} type={'area'} value={createCycleCount.note} onChange={setNote} />
            <FormStringField
              label={'Assigned Employees'}
              type={'area'}
              onFocus={() =>
                router.push('MultiEmployeeSelector', {
                  initialSelection: createCycleCount.employeeAssignments.map(assignment => assignment.employeeId),
                  onSelect: employees =>
                    setEmployeeAssignments(employees.map(employee => ({ employeeId: employee.id }))),
                })
              }
              value={createCycleCount.employeeAssignments
                .map(({ employeeId }) => {
                  const employeeQuery = employeeQueries[employeeId];
                  if (employeeQuery?.isLoading) return 'Loading...';
                  return employeeQuery?.data?.name ?? 'Unknown employee';
                })
                .join(', ')}
            />

            <FormButton
              title={'Import Products'}
              type={'primary'}
              onPress={() => {
                router.push('CycleCountProductSelector', {
                  onSelect: productVariants => {
                    // TODO: Merge this with thing scanner thing
                    setItems(current => {
                      const knownProductVariantIds = new Set(current.map(item => item.productVariantId));

                      return [
                        ...productVariants
                          .filter(pv => !knownProductVariantIds.has(pv.id))
                          .map(pv => ({
                            productVariantTitle: pv.title,
                            productTitle: pv.product.title,
                            uuid: uuid(),
                            productVariantId: pv.id,
                            // TODO: Since this adds it with qty 0, make sure to hide this product from the product selector
                            countQuantity: 0,
                            inventoryItemId: pv.inventoryItem.id,
                          })),
                        ...current,
                      ];
                    });
                  },
                });
              }}
            />

            <ProductScanner
              disabled={cycleCountMutation.isPending || isImmutable}
              onProductScanned={productVariant =>
                setItems(current => {
                  const { uuid: itemUuid, countQuantity } = current.find(
                    item => item.productVariantId === productVariant.id,
                  ) ?? {
                    uuid: uuid(),
                    countQuantity: 1,
                  };

                  return [
                    {
                      uuid: itemUuid,
                      productVariantTitle: productVariant.title,
                      productTitle: productVariant.product.title,
                      productVariantId: productVariant.id,
                      inventoryItemId: productVariant.inventoryItem.id,
                      countQuantity: countQuantity + 1,
                    },
                    ...current.filter(item => item.productVariantId !== productVariant.id),
                  ];
                })
              }
            />
          </ResponsiveGrid>

          <List data={rows} imageDisplayStrategy={'always'} />
          {rows.length === 0 && (
            <Stack direction="horizontal" alignment="center" paddingVertical="ExtraLarge">
              <Text variant="body" color="TextSubdued">
                No products scanned
              </Text>
            </Stack>
          )}
        </ResponsiveStack>
      </ScrollView>

      <ResponsiveStack
        direction={'vertical'}
        spacing={0.5}
        paddingVertical={'HalfPoint'}
        paddingHorizontal={'HalfPoint'}
        flex={0}
      >
        <ResponsiveGrid columns={4} smColumns={2} grow flex={0}>
          <Button
            title={'Actions'}
            type={'basic'}
            onPress={() =>
              router.push('ListPopup', {
                title: 'Actions',
                selection: {
                  type: 'select',
                  items: [
                    {
                      id: 'history',
                      leftSide: {
                        label: 'View application history',
                      },
                    },
                    {
                      id: 'apply',
                      leftSide: {
                        label: 'Apply',
                        subtitle: getSubtitle([
                          !createCycleCount.name || hasUnsavedChanges
                            ? 'You must save your changes before applying'
                            : undefined,
                          cycleCountQuery.data?.applicationStatus === 'APPLIED' ? 'Nothing to apply' : undefined,
                          createCycleCount.locked ? 'Locked cycle counts cannot be applied' : undefined,
                        ]),
                      },
                      disabled:
                        createCycleCount.locked ||
                        !createCycleCount.name ||
                        hasUnsavedChanges ||
                        cycleCountQuery.data?.applicationStatus === 'APPLIED',
                    },
                    {
                      id: 'lock',
                      leftSide: {
                        label: createCycleCount.locked ? 'Unlock' : 'Lock',
                        subtitle: getSubtitle([
                          createCycleCount.locked && !isSuperuser
                            ? 'You must be a superuser to unlock this cycle count'
                            : undefined,
                        ]),
                      },
                      disabled: createCycleCount.locked && !isSuperuser,
                    },
                  ],
                  onSelect: action => {
                    if (action === 'history') {
                      router.push('CycleCountApplications', { name: createCycleCount.name });
                      return;
                    }

                    if (action === 'apply') {
                      if (!createCycleCount.name) {
                        toast.show('You must save your cycle count before applying');
                        return;
                      }

                      router.push('PlanCycleCount', {
                        name: createCycleCount.name,
                        onSuccess: onMutateSuccess('Applied cycle count'),
                      });
                      return;
                    }

                    if (action === 'lock') {
                      setLocked(current => !current);
                      return;
                    }

                    toast.show(`Unknown action "${action}"`);
                  },
                },
              })
            }
          />

          <FormButton
            action={'submit'}
            title={'Save'}
            onPress={() =>
              cycleCountMutation.mutate(createCycleCount, {
                onSuccess: onMutateSuccess('Saved cycle count'),
              })
            }
            loading={cycleCountMutation.isPending}
            type={'primary'}
            disabled={!hasUnsavedChanges}
          />
        </ResponsiveGrid>
      </ResponsiveStack>
    </Form>
  );
}

function useItemRows({
  createCycleCount,
  setCreateCycleCount,
}: {
  createCycleCount: Pick<CreateCycleCount, 'name' | 'items'>;
  setCreateCycleCount: Dispatch<SetStateAction<CreateCycleCount>>;
}) {
  const { name, items } = createCycleCount;

  const setItems = getCreateCycleCountSetter(setCreateCycleCount, 'items');

  const fetch = useAuthenticatedFetch();
  const cycleCountQuery = useCycleCountQuery({ fetch, name });
  const productVariantIds = unique(items.map(item => item.productVariantId));
  const productVariantQueries = useProductVariantQueries({ fetch, ids: productVariantIds });

  const router = useRouter();

  return items.map<ListRow>(item => {
    const productVariantQuery = productVariantQueries[item.productVariantId]!;
    const productVariant = productVariantQuery.data;
    const cycleCountItem = cycleCountQuery.data?.items.find(hasPropertyValue('uuid', item.uuid));

    const label =
      getProductVariantName(
        productVariant ?? {
          title: item.productVariantTitle,
          product: { title: item.productTitle, hasOnlyDefaultVariant: false },
        },
      ) ?? 'Unknown Product';

    return {
      id: item.uuid,
      onPress: () => {
        router.push('ItemConfig', {
          name,
          item,
          onRemove: () => setItems(current => current.filter(x => x.uuid !== item.uuid)),
          onSave: ({ quantity }) =>
            setItems(current => current.map(x => (x.uuid === item.uuid ? { ...x, countQuantity: quantity } : x))),
        });
      },
      leftSide: {
        label,
        image: {
          source: productVariant?.image?.url ?? productVariant?.product?.featuredImage?.url,
          badge: item.countQuantity,
        },
        badges: [
          getCycleCountApplicationStateBadge(cycleCountItem?.applicationStatus ?? 'NOT_APPLIED', {
            appliedQuantity: cycleCountItem?.applications.at(-1)?.appliedQuantity ?? 0,
            countQuantity: item.countQuantity,
          }),
        ],
      },
      rightSide: {
        showChevron: true,
      },
    };
  });
}

function getCreateCycleCountSetter<K extends keyof CreateCycleCount>(
  setCreateCycleCount: Dispatch<SetStateAction<CreateCycleCount>>,
  key: K,
): Dispatch<SetStateAction<CreateCycleCount[K]>> {
  return arg => {
    if (typeof arg === 'function') {
      setCreateCycleCount(current => ({ ...current, [key]: arg(current[key]) }));
    } else {
      setCreateCycleCount(current => ({ ...current, [key]: arg }));
    }
  };
}
