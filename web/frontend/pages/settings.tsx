import { useAuthenticatedFetch, useToast } from '@teifi-digital/shopify-app-react';
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
  Button,
  InlineGrid,
} from '@shopify/polaris';
import { Loading, TitleBar } from '@shopify/app-bridge-react';
import type { ShopSettings } from '../../schemas/generated/shop-settings';
import { useMutation, useQuery } from 'react-query';
import { Rule, RuleSet } from '../components/RuleSet';
import { AnnotatedRangeSlider } from '../components/AnnotatedRangeSlider';
import invariant from 'tiny-invariant';

const ONLY_SHORTCUTS = 'ONLY_SHORTCUTS';
const ONLY_HIGHEST_SHORTCUT = 'ONLY_HIGHEST_SHORTCUT';
const CURRENCY_RANGE = 'CURRENCY_RANGE';
const PERCENTAGE_RANGE = 'PERCENTAGE_RANGE';

const CURRENCY = 'CA$';

type DiscountShortcutUnit = ShopSettings['discountShortcuts'][number]['unit'];
type DepositShortcutUnit = ShopSettings['depositShortcuts'][number]['unit'];

export default function Settings() {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch();
  const [settings, setSettings] = useState<ShopSettings>(null!);
  const [init, setInit] = useState(false);

  const [discountShortcutValue, setDiscountShortcutValue] = useState('');
  const [discountShortcutUnit, setDiscountShortcutUnit] = useState<DiscountShortcutUnit>('currency');

  const [depositShortcutValue, setDepositShortcutValue] = useState('');
  const [depositShortcutUnit, setDepositShortcutUnit] = useState<DepositShortcutUnit>('currency');

  const [statusValue, setStatusValue] = useState('');

  const getSettingsQuery = useQuery(
    ['settings'],
    () => fetch('/api/settings').then<{ settings: ShopSettings }>(res => res.json()),
    {
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
    },
  );

  const saveSettingsQuery = useMutation(
    ['settings'],
    (settings: ShopSettings) =>
      fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
        headers: { 'Content-Type': 'application/json' },
      }),
    {
      onError() {
        setToastAction({
          content: 'Could not save settings',
        });
      },
    },
  );

  if (!init || !settings) {
    return (
      <Frame>
        <Page>
          <Loading />
        </Page>
      </Frame>
    );
  }

  const discountRules = getDiscountRules(settings, setSettings);
  const depositRules = getDepositRules(settings, setSettings);

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
            loading: saveSettingsQuery.isLoading,
            disabled: getSettingsQuery.isLoading,
            onAction() {
              saveSettingsQuery.mutate(settings);
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
                <InlineStack blockAlign="end" gap="200">
                  <TextField
                    type="number"
                    label="Discount Shortcuts"
                    autoComplete="off"
                    value={discountShortcutValue}
                    onChange={setDiscountShortcutValue}
                    connectedRight={
                      <InlineStack blockAlign="center" gap="100">
                        <Select
                          label="Discount unit"
                          labelHidden
                          options={[
                            { label: '%', value: 'percentage' },
                            { label: CURRENCY, value: 'currency' },
                          ]}
                          value={discountShortcutUnit}
                          onChange={(value: DiscountShortcutUnit) => setDiscountShortcutUnit(value)}
                        />

                        <Button
                          disabled={discountShortcutValue === ''}
                          onClick={() => {
                            setSettings({
                              ...settings,
                              discountShortcuts: [
                                ...settings.discountShortcuts,
                                {
                                  value: Number(discountShortcutValue),
                                  unit: discountShortcutUnit,
                                },
                              ],
                            });
                            setDiscountShortcutValue('');
                          }}
                        >
                          Add
                        </Button>
                      </InlineStack>
                    }
                  />
                </InlineStack>
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
                      {String(shortcut.value)} {{ percentage: '%', currency: CURRENCY }[shortcut.unit]}
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
                <InlineStack blockAlign="end" gap="200">
                  <TextField
                    type="number"
                    label="Deposit Shortcuts"
                    autoComplete="off"
                    value={depositShortcutValue}
                    onChange={setDepositShortcutValue}
                    connectedRight={
                      <InlineStack blockAlign="center" gap="100">
                        <Select
                          label="Deposit unit"
                          labelHidden
                          options={[
                            { label: '%', value: 'percentage' },
                            { label: CURRENCY, value: 'currency' },
                          ]}
                          value={depositShortcutUnit}
                          onChange={(value: DepositShortcutUnit) => setDepositShortcutUnit(value)}
                        />
                        <Button
                          disabled={depositShortcutValue === ''}
                          onClick={() => {
                            setSettings({
                              ...settings,
                              depositShortcuts: [
                                ...settings.depositShortcuts,
                                {
                                  value: Number(depositShortcutValue),
                                  unit: depositShortcutUnit,
                                },
                              ],
                            });
                            setDepositShortcutValue('');
                          }}
                        >
                          Add
                        </Button>
                      </InlineStack>
                    }
                  />
                </InlineStack>
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
                      {String(shortcut.value)} {{ percentage: '%', currency: CURRENCY }[shortcut.unit]}
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
                <InlineStack blockAlign="end" gap="200">
                  <TextField
                    label="Statuses"
                    autoComplete="off"
                    value={statusValue}
                    onChange={setStatusValue}
                    connectedRight={
                      <Button
                        onClick={() => {
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
                        }}
                      >
                        Add
                      </Button>
                    }
                  />
                </InlineStack>
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
                        {'{id}, {year}, {month}, {day}, {hour}, {minute}'}
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
          </InlineGrid>
        </BlockStack>
      </Page>
      {toast}
    </Frame>
  );
}

function getDiscountRules(settings: ShopSettings, setSettings: (settings: ShopSettings) => void): Rule[] {
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
            formatter={num => `${CURRENCY} ${num}`}
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

function getDepositRules(settings: ShopSettings, setSettings: (settings: ShopSettings) => void): Rule[] {
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
            formatter={num => `${CURRENCY} ${num}`}
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
