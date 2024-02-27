import { useToast } from '@teifi-digital/shopify-app-react';
import { useEffect, useState } from 'react';
import {
  Card,
  Frame,
  BlockStack,
  Page,
  Text,
  Box,
  TextField,
  InlineStack,
  Tag,
  Select,
  InlineGrid,
  Checkbox,
  Combobox,
  Listbox,
  Autocomplete,
  Icon,
} from '@shopify/polaris';
import { CirclePlusMinor, SearchMinor } from '@shopify/polaris-icons';
import { Loading, TitleBar } from '@shopify/app-bridge-react';
import invariant from 'tiny-invariant';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { CurrencyFormatter, useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { useDebouncedState } from '@work-orders/common/hooks/use-debounced-state.js';
import { NumberField } from '../components/NumberField.js';
import type { ID, ShopSettings } from '../../schemas/generated/shop-settings.js';
import { Rule, RuleSet } from '../components/RuleSet.js';
import { AnnotatedRangeSlider } from '../components/AnnotatedRangeSlider.js';
import { useSettingsMutation } from '../queries/use-settings-mutation.js';
import { useCollectionsQuery } from '../queries/use-collections-query.js';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch.js';
import { Money, Decimal, BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { PermissionBoundary } from '@web/frontend/components/PermissionBoundary.js';
import { useCurrentEmployeeQuery } from '@work-orders/common/queries/use-current-employee-query.js';

const ONLY_SHORTCUTS = 'ONLY_SHORTCUTS';
const CURRENCY_RANGE = 'CURRENCY_RANGE';
const PERCENTAGE_RANGE = 'PERCENTAGE_RANGE';

export default function () {
  return (
    <Frame>
      <Page narrowWidth>
        <PermissionBoundary permissions={['read_settings']}>
          <Settings />
        </PermissionBoundary>
      </Page>
    </Frame>
  );
}

function Settings() {
  const [toast, setToastAction] = useToast();
  const [settings, setSettings] = useState<ShopSettings>(null!);

  const [discountShortcutValue, setDiscountShortcutValue] = useState('');

  const [statusValue, setStatusValue] = useState('');
  const [defaultStatusValue, setDefaultStatusValue] = useState('');

  const fetch = useAuthenticatedFetch({ setToastAction });
  const settingsQuery = useSettingsQuery(
    { fetch },
    {
      refetchOnWindowFocus: false,
      onSuccess({ settings }) {
        setSettings(settings);
        setDefaultStatusValue(settings.defaultStatus);
      },
      onError() {
        setToastAction({
          content: 'Could not load settings',
          action: {
            content: 'Retry',
            onAction() {
              settingsQuery.refetch();
            },
          },
        });
      },
    },
  );

  const currentEmployeeQuery = useCurrentEmployeeQuery({ fetch });

  const saveSettingsMutation = useSettingsMutation(
    { fetch },
    {
      onSuccess() {
        setToastAction({
          content: 'Saved settings',
        });
      },
    },
  );

  const currencyFormatter = useCurrencyFormatter({ fetch });

  const discountRules = useDiscountRules(settings, setSettings, currencyFormatter);

  if (!settings) {
    return <Loading />;
  }

  const activeDiscountRules = getActiveDiscountRules(settings);

  const superuser = currentEmployeeQuery?.data?.superuser ?? false;
  const canWriteSettings = superuser || (currentEmployeeQuery?.data?.permissions?.includes('write_settings') ?? false);

  return (
    <>
      <TitleBar
        title="Settings"
        primaryAction={{
          content: 'Save',
          target: 'APP',
          loading: saveSettingsMutation.isLoading,
          disabled:
            settingsQuery.isLoading ||
            saveSettingsMutation.isLoading ||
            currentEmployeeQuery.isLoading ||
            !canWriteSettings,
          onAction() {
            saveSettingsMutation.mutate(settings);
          },
        }}
      />

      <BlockStack gap={{ xs: '800', sm: '400' }}>
        <InlineGrid columns={{ xs: '1fr', md: '2fr 5fr' }} gap="400">
          <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Discounts
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap="400">
              <CurrencyOrPercentageInput
                value={discountShortcutValue}
                setValue={setDiscountShortcutValue}
                onSelect={unit => {
                  setSettings({
                    ...settings,
                    discountShortcuts: [
                      ...settings.discountShortcuts,
                      {
                        currency: { unit: 'currency', money: discountShortcutValue as Money } as const,
                        percentage: { unit: 'percentage', percentage: discountShortcutValue as Decimal } as const,
                      }[unit],
                    ],
                  });
                  setDiscountShortcutValue('');
                }}
              />
              <InlineStack gap="200">
                {settings.discountShortcuts.map((shortcut, i) => (
                  <Tag
                    key={i}
                    onRemove={() =>
                      setSettings({
                        ...settings,
                        discountShortcuts: settings.discountShortcuts.filter((_, j) => i !== j),
                      })
                    }
                  >
                    {shortcut.unit === 'currency' && currencyFormatter(shortcut.money)}
                    {shortcut.unit === 'percentage' && `${shortcut.percentage}%`}
                  </Tag>
                ))}
              </InlineStack>
              <RuleSet title="Discount Rules" rules={discountRules} activeRules={activeDiscountRules} />
            </BlockStack>
          </Card>
          <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Work Orders
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap="400">
              <Autocomplete
                options={[]}
                selected={[]}
                textField={
                  <Autocomplete.TextField
                    label="Statuses"
                    autoComplete="off"
                    value={statusValue}
                    onChange={setStatusValue}
                  />
                }
                onSelect={() => {}}
                actionBefore={
                  statusValue.length > 0
                    ? {
                        content: `Create status "${statusValue}"`,
                        prefix: <Icon source={CirclePlusMinor} />,
                        onAction: () => {
                          setSettings({
                            ...settings,
                            statuses: [...settings.statuses, statusValue],
                          });
                          setStatusValue('');
                        },
                      }
                    : undefined
                }
              />

              <InlineStack gap="200">
                {settings.statuses.map((status, i) => (
                  <Tag
                    key={i}
                    onRemove={() =>
                      setSettings({
                        ...settings,
                        statuses: settings.statuses.filter((_, j) => i !== j),
                      })
                    }
                  >
                    {status}
                  </Tag>
                ))}
              </InlineStack>
              <Autocomplete
                options={settings.statuses.map(status => ({ id: status, label: status, value: status }))}
                selected={[settings.defaultStatus]}
                onSelect={([defaultStatus]) => {
                  setSettings(current => ({ ...current, defaultStatus: defaultStatus ?? current.defaultStatus }));
                  setDefaultStatusValue(defaultStatus ?? settings.defaultStatus);
                }}
                textField={
                  <Autocomplete.TextField
                    label="Default Status"
                    autoComplete="off"
                    value={defaultStatusValue}
                    onChange={setDefaultStatusValue}
                    onBlur={() => setDefaultStatusValue(settings.defaultStatus)}
                  />
                }
              />
              <TextField
                label="ID Format"
                autoComplete="off"
                requiredIndicator={true}
                helpText={
                  <>
                    You can use variables by surrounding them in curly braces.
                    <br />
                    Available variables:{' '}
                    <Text as="p" fontWeight="semibold">
                      {'{{id}}, {{year}}, {{month}}, {{day}}, {{hour}}, {{minute}}'}
                    </Text>
                  </>
                }
                value={settings.idFormat}
                onChange={value =>
                  setSettings({
                    ...settings,
                    idFormat: value,
                  })
                }
              />
            </BlockStack>
          </Card>
          <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Labour
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap="400">
              <CollectionPicker
                label={'Fixed-Price Services Collection'}
                initialCollectionId={settings.fixedServiceCollectionId}
                onSelect={collectionId => setSettings({ ...settings, fixedServiceCollectionId: collectionId })}
              />
              <CollectionPicker
                label={'Dynamically-Priced Services Collection'}
                initialCollectionId={settings.mutableServiceCollectionId}
                onSelect={collectionId => setSettings({ ...settings, mutableServiceCollectionId: collectionId })}
              />
              <TextField
                label={'Default Labour Line Item Name'}
                autoComplete={'off'}
                value={settings.labourLineItemName}
                onChange={value => setSettings({ ...settings, labourLineItemName: value })}
              />
              <TextField
                label={'Labour Line Item SKU'}
                autoComplete={'off'}
                value={settings.labourLineItemSKU}
                onChange={value => setSettings({ ...settings, labourLineItemSKU: value })}
              />
              <BlockStack>
                <Text as={'p'}>Enabled Labour Options</Text>
                <Checkbox
                  label={'Employee Assignments'}
                  checked={settings.chargeSettings.employeeAssignments}
                  onChange={enabled =>
                    setSettings({
                      ...settings,
                      chargeSettings: { ...settings.chargeSettings, employeeAssignments: enabled },
                    })
                  }
                />
                <Checkbox
                  label={'Hourly Labour'}
                  checked={settings.chargeSettings.hourlyLabour}
                  onChange={enabled =>
                    setSettings({
                      ...settings,
                      chargeSettings: { ...settings.chargeSettings, hourlyLabour: enabled },
                    })
                  }
                />
                <Checkbox
                  label={'Fixed-Price Labour'}
                  checked={settings.chargeSettings.fixedPriceLabour}
                  onChange={enabled =>
                    setSettings({
                      ...settings,
                      chargeSettings: { ...settings.chargeSettings, fixedPriceLabour: enabled },
                    })
                  }
                />
              </BlockStack>
            </BlockStack>
          </Card>
          <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Rates
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap="400">
              <NumberField
                decimals={2}
                type={'number'}
                label={'Default hourly rate'}
                value={String(settings.defaultRate)}
                prefix={currencyFormatter.prefix}
                suffix={currencyFormatter.suffix}
                step={0.01}
                largeStep={1}
                min={0}
                inputMode={'decimal'}
                requiredIndicator={true}
                onChange={(value: Money) => setSettings({ ...settings, defaultRate: value })}
                autoComplete={'off'}
                helpText={'Used for employees without a set hourly rate'}
              />
            </BlockStack>
          </Card>
          <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Work Order Requests
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap="400">
              <Checkbox
                label={'Enable work order requests'}
                checked={settings.workOrderRequests.enabled}
                onChange={enabled =>
                  setSettings({
                    ...settings,
                    workOrderRequests: enabled ? { enabled, status: settings.statuses[0]! } : { enabled, status: null },
                  })
                }
              />
              <Select
                label={'Request Status'}
                helpText={'The status that work order requests will be set to when created'}
                disabled={!settings.workOrderRequests.enabled}
                options={settings.statuses}
                placeholder={'Select a status'}
                value={settings.workOrderRequests?.status ?? undefined}
                onChange={status =>
                  setSettings({
                    ...settings,
                    workOrderRequests: {
                      enabled: true,
                      status,
                    },
                  })
                }
              />
            </BlockStack>
          </Card>
        </InlineGrid>
      </BlockStack>

      {toast}
    </>
  );
}

const useCurrencyRangeBounds = (initialCurrencyRangeBounds: [number, number] = [100, 100]) => {
  const CURRENCY_RANGE_MAX_GROWTH_RATE = 1.25;

  const [min, initialMax] = initialCurrencyRangeBounds;

  const getMaxBound = (currentUpperBound: number) =>
    Math.round(Math.max(currentUpperBound * CURRENCY_RANGE_MAX_GROWTH_RATE, initialMax));

  const [max, setMax] = useDebouncedState(getMaxBound(initialMax));

  const update = ([, upper]: [number, number]) => {
    setMax(getMaxBound(upper));
  };

  return { min, max, update };
};

function useDiscountRules(
  settings: ShopSettings | null,
  setSettings: (settings: ShopSettings) => void,
  currencyFormatter: CurrencyFormatter,
): Rule[] {
  const initialCurrencyRangeBounds = [0, 100] as [number, number];
  const currencyRangeBounds = useCurrencyRangeBounds(initialCurrencyRangeBounds);

  if (!settings) {
    return [];
  }

  return [
    {
      value: ONLY_SHORTCUTS,
      title: 'Only allow discount shortcuts',
      conflictingRules: [CURRENCY_RANGE, PERCENTAGE_RANGE],
      onSelect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            onlyAllowShortcuts: true,
            allowedCurrencyRange: null,
            allowedPercentageRange: null,
          },
        });
      },
      onDeselect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            onlyAllowShortcuts: false,
          },
        });
      },
    },
    {
      value: CURRENCY_RANGE,
      title: 'Restrict discounts to a range',
      conflictingRules: [ONLY_SHORTCUTS],
      onSelect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            onlyAllowShortcuts: false,
            allowedCurrencyRange: [
              initialCurrencyRangeBounds[0].toFixed(2) as Money,
              initialCurrencyRangeBounds[1].toFixed(2) as Money,
            ],
          },
        });
      },
      onDeselect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            allowedCurrencyRange: null,
          },
        });
      },
      renderChildren() {
        invariant(settings.discountRules.allowedCurrencyRange, 'No currency range set');

        return (
          <AnnotatedRangeSlider
            label="Allowed discount range"
            labelHidden
            min={currencyRangeBounds.min}
            max={currencyRangeBounds.max}
            step={1}
            formatter={currencyFormatter}
            value={
              [
                Number(settings.discountRules.allowedCurrencyRange[0]),
                Number(settings.discountRules.allowedCurrencyRange[1]),
              ] as [number, number]
            }
            onChange={(allowedCurrencyRange: [number, number]) => {
              setSettings({
                ...settings,
                discountRules: {
                  ...settings.discountRules,
                  onlyAllowShortcuts: false,
                  allowedCurrencyRange: [
                    allowedCurrencyRange[0].toFixed(2) as Money,
                    allowedCurrencyRange[1].toFixed(2) as Money,
                  ],
                },
              });

              currencyRangeBounds.update(allowedCurrencyRange);
            }}
          />
        );
      },
    },
    {
      value: PERCENTAGE_RANGE,
      title: 'Restrict discounts to a percentage range',
      conflictingRules: [ONLY_SHORTCUTS],
      onSelect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            onlyAllowShortcuts: false,
            allowedPercentageRange: [BigDecimal.ZERO.toDecimal(), BigDecimal.fromString('100').toDecimal()],
          },
        });
      },
      onDeselect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            allowedPercentageRange: null,
          },
        });
      },
      renderChildren() {
        invariant(settings.discountRules.allowedPercentageRange, 'No percentage range set');

        return (
          <AnnotatedRangeSlider
            label="Allowed discount percentage range"
            labelHidden
            min={0}
            max={100}
            step={1}
            formatter={num => `${num}%`}
            value={[
              Number(settings.discountRules.allowedPercentageRange[0]),
              Number(settings.discountRules.allowedPercentageRange[1]),
            ]}
            onChange={(allowedPercentageRange: [number, number]) =>
              setSettings({
                ...settings,
                discountRules: {
                  ...settings.discountRules,
                  onlyAllowShortcuts: false,
                  allowedPercentageRange: [
                    BigDecimal.fromString(String(allowedPercentageRange[0])).toDecimal(),
                    BigDecimal.fromString(String(allowedPercentageRange[1])).toDecimal(),
                  ],
                },
              })
            }
          />
        );
      },
    },
  ];
}

function getActiveDiscountRules(settings: ShopSettings) {
  const activeRules: string[] = [];

  if (settings.discountRules.onlyAllowShortcuts) {
    activeRules.push(ONLY_SHORTCUTS);
  } else {
    if (settings.discountRules.allowedCurrencyRange) {
      activeRules.push(CURRENCY_RANGE);
    }
    if (settings.discountRules.allowedPercentageRange) {
      activeRules.push(PERCENTAGE_RANGE);
    }
  }

  return activeRules;
}

function CurrencyOrPercentageInput({
  value,
  setValue,
  onSelect,
}: {
  value: string;
  setValue: (value: string) => void;
  onSelect: (unit: 'percentage' | 'currency') => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  return (
    <>
      <Combobox
        activator={
          <Combobox.TextField
            type="number"
            label="Discount Shortcuts"
            autoComplete="off"
            value={value}
            onChange={setValue}
          />
        }
      >
        {value.length > 0 ? (
          <Listbox onSelect={onSelect}>
            <Listbox.Option value={'currency'}>{currencyFormatter(Number(value))}</Listbox.Option>
            <Listbox.Option value={'percentage'}>{value + '%'}</Listbox.Option>
          </Listbox>
        ) : null}
      </Combobox>
      {toast}
    </>
  );
}

function CollectionPicker({
  label,
  helpText,
  onSelect,
  initialCollectionId,
}: {
  label: string;
  helpText?: string;
  initialCollectionId?: ID | null;
  onSelect: (collectionId: ID | null) => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [query, setQuery] = useState('');
  const collectionsQuery = useCollectionsQuery({ fetch, params: { query } });

  const [selectedCollectionId, setSelectedCollectionId] = useState<ID | null>(initialCollectionId ?? null);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string | null>(null);

  useEffect(() => {
    if (query) return;
    if (!selectedCollectionId) return;

    const selectedCollection = collectionsQuery.data?.pages.flat(1).find(page => page.id === selectedCollectionId);
    if (!selectedCollection) return;

    setSelectedCollectionName(selectedCollection.title);
    setQuery(selectedCollection.title);
  }, [collectionsQuery.data?.pages]);

  return (
    <>
      <Autocomplete
        options={
          collectionsQuery.data?.pages.flat().map(page => ({
            label: page.title,
            value: page.id,
          })) ?? []
        }
        allowMultiple={false}
        loading={collectionsQuery.isLoading}
        willLoadMoreResults={collectionsQuery.hasNextPage}
        onLoadMoreResults={collectionsQuery.fetchNextPage}
        selected={selectedCollectionId ? [selectedCollectionId] : []}
        emptyState={
          <BlockStack inlineAlign={'center'}>
            <Icon source={SearchMinor} />
            Could not find any collections
          </BlockStack>
        }
        textField={
          <Autocomplete.TextField
            label={label}
            helpText={helpText}
            autoComplete="off"
            value={query}
            onChange={setQuery}
            onBlur={() => setQuery(selectedCollectionName ?? '')}
          />
        }
        onSelect={([id]: ID[]) => {
          let name: string | null = null;
          let serviceCollectionId: ID | null = null;

          if (id !== undefined && id !== selectedCollectionId) {
            name = collectionsQuery.data?.pages.flat(1).find(page => page.id === id)?.title ?? '';
            serviceCollectionId = id;
          }

          setSelectedCollectionName(name ?? '');
          setSelectedCollectionId(serviceCollectionId ?? null);
          setQuery(name ?? '');
          onSelect(serviceCollectionId);
        }}
      />
      {toast}
    </>
  );
}
