import type { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { Dispatch, SetStateAction, useState } from 'react';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { CurrencyFormatter, useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { BlockStack, Box, Card, InlineStack, Tag, Text } from '@shopify/polaris';
import { BigDecimal, Decimal, Money, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { Rule, RuleSet } from '@web/frontend/components/RuleSet.js';
import invariant from 'tiny-invariant';
import { AnnotatedRangeSlider } from '@web/frontend/components/AnnotatedRangeSlider.js';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { CurrencyOrPercentageInput } from '@web/frontend/components/settings/CurrencyOrPercentageInput.js';

export function DiscountSettings({
  settings,
  setSettings,
}: {
  settings: ShopSettings;
  setSettings: Dispatch<SetStateAction<ShopSettings>>;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const [discountShortcutValue, setDiscountShortcutValue] = useState('');

  const discountRules = useDiscountRules(settings, setSettings, currencyFormatter);
  const activeDiscountRules = getActiveDiscountRules(settings);

  return (
    <>
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
            label={'Discount Shortcuts'}
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
      {toast}
    </>
  );
}

const ONLY_SHORTCUTS = 'ONLY_SHORTCUTS';
const CURRENCY_RANGE = 'CURRENCY_RANGE';
const PERCENTAGE_RANGE = 'PERCENTAGE_RANGE';

function useDiscountRules(
  settings: ShopSettings | null,
  setSettings: (settings: ShopSettings) => void,
  currencyFormatter: CurrencyFormatter,
): Rule[] {
  const initialCurrencyRangeBounds = [BigDecimal.ZERO.toMoney(), BigDecimal.fromString('100').toMoney()] as const;
  const currencyRangeBounds = useCurrencyRangeBounds(initialCurrencyRangeBounds[0], initialCurrencyRangeBounds[1]);

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
            allowedCurrencyRange: [...initialCurrencyRangeBounds],
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
            min={Number(currencyRangeBounds.min)}
            max={Number(currencyRangeBounds.max)}
            step={1}
            formatter={currencyFormatter}
            value={[
              Number(settings.discountRules.allowedCurrencyRange[0]),
              Number(settings.discountRules.allowedCurrencyRange[1]),
            ]}
            onChange={(allowedCurrencyRange: [number, number]) => {
              const min = BigDecimal.fromString(allowedCurrencyRange[0].toFixed(2)).toMoney();
              const max = BigDecimal.fromString(allowedCurrencyRange[1].toFixed(2)).toMoney();

              setSettings({
                ...settings,
                discountRules: {
                  ...settings.discountRules,
                  onlyAllowShortcuts: false,
                  allowedCurrencyRange: [min, max],
                },
              });

              currencyRangeBounds.updateMax(max);
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

const useCurrencyRangeBounds = (min: Money, initialMax: Money) => {
  const CURRENCY_RANGE_MAX_GROWTH_RATE = 1.25;

  const getMaxBound = (currentUpperBound: Money) =>
    BigDecimal.fromString(String(CURRENCY_RANGE_MAX_GROWTH_RATE))
      .multiply(BigDecimal.fromMoney(currentUpperBound))
      .round(0, RoundingMode.CEILING)
      .toMoney();

  const [max, setMax] = useDebouncedState(getMaxBound(initialMax));

  const updateMax = (max: Money) => setMax(getMaxBound(max));

  return { min, max, updateMax };
};
