import { useToast } from '@teifi-digital/shopify-app-react';
import { useState } from 'react';
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
import { Loading, TitleBar } from '@shopify/app-bridge-react';
import type { ShopSettings } from '../../schemas/generated/shop-settings';
import { Rule, RuleSet } from '../components/RuleSet';
import { AnnotatedRangeSlider } from '../components/AnnotatedRangeSlider';
import invariant from 'tiny-invariant';
import { useSettingsQuery } from '../hooks/use-settings-query';
import { useSettingsMutation } from '../hooks/use-settings-mutation';
import { CurrencyFormatter, useCurrencyFormatter } from '../hooks/use-currency-formatter';
import { CirclePlusMinor, SearchMinor } from '@shopify/polaris-icons';
import { useCollectionsQuery } from '../hooks/use-collections-query';

const ONLY_SHORTCUTS = 'ONLY_SHORTCUTS';
const ONLY_HIGHEST_SHORTCUT = 'ONLY_HIGHEST_SHORTCUT';
const CURRENCY_RANGE = 'CURRENCY_RANGE';
const PERCENTAGE_RANGE = 'PERCENTAGE_RANGE';

export default function Settings() {
  const [toast, setToastAction] = useToast();
  const [settings, setSettings] = useState<ShopSettings>(null!);
  const [init, setInit] = useState(false);

  const [discountShortcutValue, setDiscountShortcutValue] = useState('');
  const [depositShortcutValue, setDepositShortcutValue] = useState('');

  const [statusValue, setStatusValue] = useState('');

  const getSettingsQuery = useSettingsQuery({
    refetchOnWindowFocus: false,
    onSuccess({ settings }) {
      setSettings(settings);
      setInit(true);
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
  });

  const saveSettingsMutation = useSettingsMutation({
    onError() {
      setToastAction({
        content: 'Could not save settings',
      });
    },
    onSuccess() {
      setToastAction({
        content: 'Saved settings',
      });
    },
  });

  const [labourCollectionValue, setLabourCollectionValue] = useState('');
  const [selectedLabourCollectionName, setSelectedLabourCollectionName] = useState<string | null>(null);
  const collectionsQuery = useCollectionsQuery({ query: labourCollectionValue });

  const currencyFormatter = useCurrencyFormatter();

  if (!init || !settings) {
    return (
      <Frame>
        <Page>
          <Loading />
        </Page>
      </Frame>
    );
  }

  const discountRules = getDiscountRules(settings, setSettings, currencyFormatter);
  const depositRules = getDepositRules(settings, setSettings, currencyFormatter);

  const activeDiscountRules = getActiveDiscountRules(settings);
  const activeDepositRules = getActiveDepositRules(settings);

  return (
    <Frame>
      <Page narrowWidth>
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
                      {shortcut.unit === 'currency' ? currencyFormatter(shortcut.value) : null}
                      {shortcut.unit === 'percentage' ? `${shortcut.value}%` : null}
                    </Tag>
                  ))}
                </InlineStack>
                <RuleSet title="Discount Rules" rules={discountRules} activeRules={activeDiscountRules} />
              </BlockStack>
            </Card>
            <Box as="section" paddingInlineStart={{ xs: '400', sm: '0' }} paddingInlineEnd={{ xs: '400', sm: '0' }}>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Deposits
                </Text>
              </BlockStack>
            </Box>
            <Card roundedAbove="sm">
              <BlockStack gap="400">
                <CurrencyOrPercentageInput
                  value={depositShortcutValue}
                  setValue={setDepositShortcutValue}
                  onSelect={unit => {
                    setSettings({
                      ...settings,
                      depositShortcuts: [
                        ...settings.depositShortcuts,
                        {
                          value: Number(depositShortcutValue),
                          unit,
                        },
                      ],
                    });
                    setDepositShortcutValue('');
                  }}
                />
                <InlineStack gap="200">
                  {settings.depositShortcuts.map((shortcut, i) => (
                    <Tag
                      key={i}
                      onRemove={() =>
                        setSettings({
                          ...settings,
                          depositShortcuts: settings.depositShortcuts.filter((_, j) => i !== j),
                        })
                      }
                    >
                      {shortcut.unit === 'currency' ? currencyFormatter(shortcut.value) : null}
                      {shortcut.unit === 'percentage' ? `${shortcut.value}%` : null}
                    </Tag>
                  ))}
                </InlineStack>
                <RuleSet title="Deposit Rules" rules={depositRules} activeRules={activeDepositRules} />
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
                  selected={settings.labourCollectionId ? [settings.labourCollectionId] : []}
                  emptyState={
                    <BlockStack inlineAlign={'center'}>
                      <Icon source={SearchMinor} />
                      Could not find any collections
                    </BlockStack>
                  }
                  textField={
                    <Autocomplete.TextField
                      label="Labour Collection"
                      autoComplete="off"
                      value={labourCollectionValue}
                      onChange={setLabourCollectionValue}
                      onBlur={() => setLabourCollectionValue(selectedLabourCollectionName ?? '')}
                    />
                  }
                  onSelect={([id]) => {
                    const name = collectionsQuery.data?.pages.find(page => page.id === id)?.title ?? '';
                    setSelectedLabourCollectionName(name);
                    setLabourCollectionValue(name);
                    setSettings({ ...settings, labourCollectionId: id });
                  }}
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
                        ? { enabled, allowedStatuses: [settings.statuses[0].name] }
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

function getDiscountRules(
  settings: ShopSettings,
  setSettings: (settings: ShopSettings) => void,
  currencyFormatter: CurrencyFormatter,
): Rule[] {
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
            allowedCurrencyRange: [0, 100],
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
            min={0}
            max={123}
            step={1}
            formatter={currencyFormatter}
            value={settings.discountRules.allowedCurrencyRange}
            onChange={(value: [number, number]) =>
              setSettings({
                ...settings,
                discountRules: {
                  ...settings.discountRules,
                  onlyAllowShortcuts: false,
                  allowedCurrencyRange: value,
                },
              })
            }
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
            onChange={(value: [number, number]) =>
              setSettings({
                ...settings,
                discountRules: {
                  ...settings.discountRules,
                  onlyAllowShortcuts: false,
                  allowedPercentageRange: value,
                },
              })
            }
          />
        );
      },
    },
  ];
}

function getDepositRules(
  settings: ShopSettings,
  setSettings: (settings: ShopSettings) => void,
  currencyFormatter: CurrencyFormatter,
): Rule[] {
  return [
    {
      value: ONLY_SHORTCUTS,
      title: 'Only allow deposit shortcuts',
      conflictingRules: [CURRENCY_RANGE, PERCENTAGE_RANGE],
      onSelect() {
        setSettings({
          ...settings,
          depositRules: {
            ...settings.depositRules,
            onlyAllowShortcuts: true,
            allowedCurrencyRange: null,
            allowedPercentageRange: null,
          },
        });
      },
      onDeselect() {
        setSettings({
          ...settings,
          depositRules: {
            ...settings.depositRules,
            onlyAllowShortcuts: false,
            onlyAllowHighestAbsoluteShortcut: false,
          },
        });
      },
    },
    {
      value: ONLY_HIGHEST_SHORTCUT,
      title: 'Only allow the highest absolute deposit shortcut',
      requiredRules: [ONLY_SHORTCUTS],
      onSelect() {
        invariant(settings.depositRules.onlyAllowShortcuts, 'Only allow shortcuts must be selected');

        setSettings({
          ...settings,
          depositRules: {
            ...settings.depositRules,
            onlyAllowHighestAbsoluteShortcut: true,
          },
        });
      },
      onDeselect() {
        setSettings({
          ...settings,
          depositRules: {
            ...settings.depositRules,
            onlyAllowHighestAbsoluteShortcut: false,
          },
        });
      },
    },
    {
      value: CURRENCY_RANGE,
      title: 'Allow deposits within a range',
      conflictingRules: [ONLY_SHORTCUTS],
      onSelect() {
        setSettings({
          ...settings,
          depositRules: {
            ...settings.depositRules,
            onlyAllowShortcuts: false,
            onlyAllowHighestAbsoluteShortcut: false,
            allowedCurrencyRange: [0, 100],
          },
        });
      },
      onDeselect() {
        setSettings({
          ...settings,
          depositRules: {
            ...settings.depositRules,
            allowedCurrencyRange: null,
          },
        });
      },
      renderChildren() {
        invariant(settings.depositRules.allowedCurrencyRange, 'No currency range set');

        return (
          <AnnotatedRangeSlider
            label="Allowed deposit range"
            labelHidden
            min={0}
            max={123}
            step={1}
            formatter={currencyFormatter}
            value={settings.depositRules.allowedCurrencyRange}
            onChange={(value: [number, number]) =>
              setSettings({
                ...settings,
                depositRules: {
                  ...settings.depositRules,
                  onlyAllowShortcuts: false,
                  onlyAllowHighestAbsoluteShortcut: false,
                  allowedCurrencyRange: value,
                },
              })
            }
          />
        );
      },
    },
    {
      value: PERCENTAGE_RANGE,
      title: 'Allow deposits within a percentage range',
      conflictingRules: [ONLY_SHORTCUTS],
      onSelect() {
        setSettings({
          ...settings,
          depositRules: {
            ...settings.depositRules,
            onlyAllowShortcuts: false,
            onlyAllowHighestAbsoluteShortcut: false,
            // TODO: cache this
            allowedPercentageRange: [0, 100],
          },
        });
      },
      onDeselect() {
        setSettings({
          ...settings,
          depositRules: {
            ...settings.depositRules,
            allowedPercentageRange: null,
          },
        });
      },
      renderChildren() {
        invariant(settings.depositRules.allowedPercentageRange, 'No percentage range set');

        return (
          <AnnotatedRangeSlider
            label="Allowed deposit percentage range"
            labelHidden
            min={0}
            max={100}
            step={1}
            formatter={num => `${num}%`}
            value={settings.depositRules.allowedPercentageRange}
            onChange={(value: [number, number]) =>
              setSettings({
                ...settings,
                depositRules: {
                  ...settings.depositRules,
                  onlyAllowShortcuts: false,
                  onlyAllowHighestAbsoluteShortcut: false,
                  allowedPercentageRange: value,
                },
              })
            }
          />
        );
      },
    },
  ];
}

function getActiveDepositRules(settings: ShopSettings) {
  const activeRules: string[] = [];

  if (settings.depositRules.onlyAllowShortcuts) {
    activeRules.push(ONLY_SHORTCUTS);
    if (settings.depositRules.onlyAllowHighestAbsoluteShortcut) {
      activeRules.push(ONLY_HIGHEST_SHORTCUT);
    }
  } else {
    if (settings.depositRules.allowedCurrencyRange) {
      activeRules.push(CURRENCY_RANGE);
    }
    if (settings.depositRules.allowedPercentageRange) {
      activeRules.push(PERCENTAGE_RANGE);
    }
  }

  return activeRules;
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
  const currencyFormatter = useCurrencyFormatter();

  return (
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
  );
}
