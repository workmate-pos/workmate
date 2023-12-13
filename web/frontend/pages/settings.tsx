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
import { NumberField } from '../components/NumberField';
import { Loading, TitleBar } from '@shopify/app-bridge-react';
import type { ShopSettings } from '../../schemas/generated/shop-settings';
import { Rule, RuleSet } from '../components/RuleSet';
import { AnnotatedRangeSlider } from '../components/AnnotatedRangeSlider';
import invariant from 'tiny-invariant';
import { useSettingsQuery } from '@common/queries/use-settings-query';
import { useSettingsMutation } from '../queries/use-settings-mutation';
import { CurrencyFormatter, useCurrencyFormatter } from '@common/hooks/use-currency-formatter';
import { CirclePlusMinor, SearchMinor } from '@shopify/polaris-icons';
import { useCollectionsQuery } from '../queries/use-collections-query';
import { useDebouncedState } from '@common/hooks/use-debounced-state';
import { useAuthenticatedFetch } from '../hooks/use-authenticated-fetch';

const ONLY_SHORTCUTS = 'ONLY_SHORTCUTS';
const ONLY_HIGHEST_SHORTCUT = 'ONLY_HIGHEST_SHORTCUT';
const CURRENCY_RANGE = 'CURRENCY_RANGE';
const PERCENTAGE_RANGE = 'PERCENTAGE_RANGE';

export default function Settings() {
  const [toast, setToastAction] = useToast();
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  const [discountShortcutValue, setDiscountShortcutValue] = useState('');
  const [depositShortcutValue, setDepositShortcutValue] = useState('');

  const [statusValue, setStatusValue] = useState('');

  const fetch = useAuthenticatedFetch({ setToastAction });
  const getSettingsQuery = useSettingsQuery(
    { fetch },
    {
      refetchOnWindowFocus: false,
      onSuccess({ settings }) {
        setSettings(settings);
      },
      onError() {
        setToastAction({
          content: 'Could not load settings',
          action: {
            content: 'Retry',
            onAction() {
              getSettingsQuery.refetch();
            },
          },
        });
      },
    },
  );

  const saveSettingsMutation = useSettingsMutation({
    onError() {
      setToastAction({
        content: 'An error occurred while saving settings',
      });
    },
    onSuccess() {
      setToastAction({
        content: 'Saved settings',
      });
    },
  });

  const [serviceCollectionValue, setServiceCollectionValue] = useState<string | undefined>(undefined);
  const [selectedServiceCollectionName, setSelectedServiceCollectionName] = useState<string | null>(null);
  const collectionsQuery = useCollectionsQuery({ fetch, params: { query: serviceCollectionValue } });

  // set the service collection name when the settings & collections are both loaded
  useEffect(() => {
    if (serviceCollectionValue !== undefined) return;

    const collections = collectionsQuery.data?.pages;
    const collectionId = getSettingsQuery.data?.settings.serviceCollectionId;

    if (!collections || !collectionId) return;

    const selectedCollection = collections.find(collection => collection.id === collectionId);
    setSelectedServiceCollectionName(selectedCollection?.title ?? null);
    setServiceCollectionValue(selectedCollection?.title ?? '');
  }, [collectionsQuery.data?.pages, getSettingsQuery.data?.settings.serviceCollectionId]);

  const currencyFormatter = useCurrencyFormatter({ fetch });

  const discountRules = useDiscountRules(settings, setSettings, currencyFormatter);

  if (!settings) {
    return (
      <Frame>
        <Page>
          <Loading />
        </Page>
      </Frame>
    );
  }

  const activeDiscountRules = getActiveDiscountRules(settings);

  return (
    <Frame>
      <TitleBar
        title="Settings"
        primaryAction={{
          content: 'Save',
          target: 'APP',
          loading: saveSettingsMutation.isLoading,
          disabled: getSettingsQuery.isLoading,
          onAction() {
            saveSettingsMutation.mutate(settings);
          },
        }}
      />

      <Page narrowWidth>
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
                          value: Number(discountShortcutValue),
                          unit,
                        },
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
                      {shortcut.unit === 'currency' && currencyFormatter(shortcut.value)}
                      {shortcut.unit === 'percentage' && `${shortcut.value}%`}
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
                              statuses: [
                                ...settings.statuses,
                                {
                                  name: statusValue,
                                  bgHex: '#000000',
                                  textHex: '#ffffff',
                                },
                              ],
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
                      {status.name}
                    </Tag>
                  ))}
                </InlineStack>
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
                  Service
                </Text>
              </BlockStack>
            </Box>
            <Card roundedAbove="sm">
              <BlockStack gap="400">
                <Autocomplete
                  options={
                    collectionsQuery.data?.pages.map(page => ({
                      label: page.title,
                      value: page.id,
                    })) ?? []
                  }
                  allowMultiple={false}
                  loading={collectionsQuery.isLoading}
                  willLoadMoreResults={collectionsQuery.hasNextPage}
                  onLoadMoreResults={collectionsQuery.fetchNextPage}
                  selected={settings.serviceCollectionId ? [settings.serviceCollectionId] : []}
                  emptyState={
                    <BlockStack inlineAlign={'center'}>
                      <Icon source={SearchMinor} />
                      Could not find any collections
                    </BlockStack>
                  }
                  textField={
                    <Autocomplete.TextField
                      label="Service Collection"
                      autoComplete="off"
                      value={serviceCollectionValue}
                      onChange={setServiceCollectionValue}
                      onBlur={() => setServiceCollectionValue(selectedServiceCollectionName ?? '')}
                    />
                  }
                  onSelect={([id]) => {
                    let name: string | null = null;
                    let serviceCollectionId: string | null = null;

                    if (id !== undefined && id !== settings?.serviceCollectionId) {
                      name = collectionsQuery.data?.pages.find(page => page.id === id)?.title ?? '';
                      serviceCollectionId = id;
                    }

                    setSelectedServiceCollectionName(name);
                    setServiceCollectionValue(name ?? '');
                    setSettings({ ...settings, serviceCollectionId });
                  }}
                />
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
                  onChange={value => setSettings({ ...settings, defaultRate: Number(value) })}
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
                      workOrderRequests: enabled
                        ? { enabled, allowedStatuses: [settings.statuses[0]!.name] }
                        : { enabled, allowedStatuses: null },
                    })
                  }
                />
                <Select
                  label={'Request Status'}
                  helpText={'The status that work order requests will be set to when created'}
                  disabled={!settings.workOrderRequests.enabled}
                  options={settings.statuses.map(status => status.name)}
                  placeholder={'Select a status'}
                  value={settings.workOrderRequests.allowedStatuses?.[0]}
                  onChange={statusName =>
                    setSettings({
                      ...settings,
                      workOrderRequests: {
                        enabled: true,
                        allowedStatuses: [statusName],
                      },
                    })
                  }
                />
              </BlockStack>
            </Card>
          </InlineGrid>
        </BlockStack>
      </Page>
      {toast}
    </Frame>
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
      title: 'Allow discounts within a range',
      conflictingRules: [ONLY_SHORTCUTS],
      onSelect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            onlyAllowShortcuts: false,
            allowedCurrencyRange: initialCurrencyRangeBounds,
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
            value={settings.discountRules.allowedCurrencyRange}
            onChange={(allowedCurrencyRange: [number, number]) => {
              setSettings({
                ...settings,
                discountRules: {
                  ...settings.discountRules,
                  onlyAllowShortcuts: false,
                  allowedCurrencyRange,
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
      title: 'Allow discounts within a percentage range',
      conflictingRules: [ONLY_SHORTCUTS],
      onSelect() {
        setSettings({
          ...settings,
          discountRules: {
            ...settings.discountRules,
            onlyAllowShortcuts: false,
            allowedPercentageRange: [0, 100],
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
            value={settings.discountRules.allowedPercentageRange}
            onChange={(allowedPercentageRange: [number, number]) =>
              setSettings({
                ...settings,
                discountRules: {
                  ...settings.discountRules,
                  onlyAllowShortcuts: false,
                  allowedPercentageRange,
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
