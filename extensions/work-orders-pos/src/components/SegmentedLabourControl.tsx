import { SegmentedControl, Stepper, Text, TextField, Stack, Selectable } from '@shopify/retail-ui-extensions-react';
import { Segment } from '@shopify/retail-ui-extensions/src/components/SegmentedControl/SegmentedControl.js';
import { getTotalPriceForCharges } from '../create-work-order/charges.js';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import type { ShopSettings } from '@web/schemas/generated/shop-settings.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { CreateWorkOrderCharge } from '../types.js';

type SegmentId = CreateWorkOrderCharge['type'] | 'none';

const segmentLabels: Record<SegmentId, string> = {
  none: 'None',
  'fixed-price-labour': 'Fixed Price',
  'hourly-labour': 'Hourly',
};

const segmentToggleName: Partial<Record<SegmentId, keyof ShopSettings['chargeSettings']>> = {
  'fixed-price-labour': 'fixedPriceLabour',
  'hourly-labour': 'hourlyLabour',
};

type ChargeType<SegmentTypes extends SegmentId> = SegmentTypes extends 'none'
  ? null
  : DiscriminatedUnionOmit<CreateWorkOrderCharge & { type: SegmentTypes }, 'uuid' | 'workOrderItemUuid' | 'employeeId'>;

/**
 * Segmented labour configuration control.
 * Automatically hides segments if they are disabled in the shop settings.
 * If there is a charge for a hidden segment, the segment will still be shown.
 */
export function SegmentedLabourControl<const SegmentTypes extends readonly SegmentId[]>({
  types,
  charge,
  onChange,
  disabled = false,
  defaultHourlyRate,
}: {
  types: SegmentTypes;
  disabled?: boolean;
  charge: ChargeType<SegmentTypes[number]>;
  onChange: (charge: ChargeType<SegmentTypes[number]>) => void;
  defaultHourlyRate?: Money;
}) {
  const fetch = useAuthenticatedFetch();
  const settings = useSettingsQuery({ fetch })?.data?.settings;
  const currencyFormatter = useCurrencyFormatter();

  if (!settings) return null;

  const shouldShowSegment = (type: SegmentTypes[number]) => {
    if (type === charge?.type) return true;
    const toggleName = segmentToggleName[type];
    if (!toggleName) return true;
    return settings.chargeSettings[toggleName];
  };

  const segments = types.map<Segment>(type => ({
    id: type,
    label: segmentLabels[type],
    disabled: disabled || !shouldShowSegment(type),
  }));

  const selectedSegmentId = charge?.type ?? 'none';

  const canResetLabour =
    defaultHourlyRate &&
    charge?.type === 'hourly-labour' &&
    !BigDecimal.fromMoney(defaultHourlyRate).equals(BigDecimal.fromMoney(charge.rate));

  const onSelect = (id: SegmentTypes[number]) => {
    switch (id) {
      case 'none': {
        onChange(null as any);
        break;
      }

      case 'fixed-price-labour': {
        const fixedPriceLabour: ChargeType<'fixed-price-labour'> = {
          type: 'fixed-price-labour',
          name: charge?.name ?? (settings.labourLineItemName || 'Labour'),
          amount: getTotalPriceForCharges(charge ? [charge] : []),
        };

        onChange(fixedPriceLabour as any);
        break;
      }

      case 'hourly-labour': {
        const hourlyLabour: ChargeType<'hourly-labour'> = {
          type: 'hourly-labour',
          name: charge?.name ?? (settings.labourLineItemName || 'Labour'),
          rate: getTotalPriceForCharges(charge ? [charge] : []),
          hours: BigDecimal.ONE.toDecimal(),
        };

        onChange(hourlyLabour as any);
        break;
      }
    }
  };

  if (segments.length === 0) {
    return null;
  }

  if (segments.length === 1 && segments.some(s => s.id === 'none')) {
    return null;
  }

  return (
    <Stack direction={'vertical'} spacing={2}>
      {segments.length > 1 && <SegmentedControl segments={segments} selected={selectedSegmentId} onSelect={onSelect} />}
      {charge && (
        <TextField
          label={'Labour Name'}
          value={charge.name}
          onChange={(name: string) => onChange({ ...charge, name })}
          isValid={charge.name.length > 0}
          errorMessage={charge.name.length === 0 ? 'Labour name is required' : undefined}
          disabled={disabled}
        />
      )}
      {charge?.type === 'hourly-labour' && (
        <>
          <Stack direction={'horizontal'} alignment={'space-between'}>
            <Text color={'TextSubdued'} variant={'headingSmall'}>
              Hourly Rate
            </Text>
            {defaultHourlyRate && (
              <Selectable
                disabled={disabled || !canResetLabour}
                onPress={() => onChange({ ...charge, rate: defaultHourlyRate })}
              >
                <Text color={canResetLabour ? 'TextInteractive' : 'TextSubdued'}>Reset</Text>
              </Selectable>
            )}
          </Stack>
          <Stepper
            disabled={disabled}
            initialValue={Number(charge.rate)}
            value={Number(charge.rate)}
            minimumValue={0}
            onValueChanged={(rate: number) => {
              if (!BigDecimal.isValid(rate.toFixed(2))) return;

              onChange({
                ...charge,
                rate: BigDecimal.fromString(rate.toFixed(2)).toMoney(),
              });
            }}
          ></Stepper>

          <Stack direction={'horizontal'}>
            <Text color={'TextSubdued'} variant={'headingSmall'}>
              Hours
            </Text>
          </Stack>
          <Stepper
            disabled={disabled}
            initialValue={Number(charge.hours)}
            value={Number(charge.hours)}
            minimumValue={0}
            onValueChanged={(hours: number) => {
              if (!BigDecimal.isValid(hours.toFixed(2))) return;

              onChange({
                ...charge,
                hours: BigDecimal.fromString(hours.toFixed(2)).toDecimal(),
              });
            }}
          ></Stepper>
          <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
            <Text variant={'headingSmall'} color={'TextSubdued'}>
              {charge.hours} hours × {currencyFormatter(charge.rate)}/hour ={' '}
              {currencyFormatter(
                BigDecimal.fromDecimal(charge.hours).multiply(BigDecimal.fromMoney(charge.rate)).toMoney(),
              )}
            </Text>
          </Stack>
        </>
      )}
      {charge?.type === 'fixed-price-labour' && (
        <>
          <Stack direction={'horizontal'} flexChildren>
            <Text color={'TextSubdued'} variant={'headingSmall'}>
              Price
            </Text>
          </Stack>
          <Stack direction={'horizontal'} alignment={'space-between'} flexChildren>
            <Stepper
              disabled={disabled}
              initialValue={Number(charge.amount)}
              value={Number(charge.amount)}
              minimumValue={0}
              onValueChanged={(amount: number) => {
                if (!BigDecimal.isValid(amount.toFixed(2))) return;

                onChange({
                  ...charge,
                  amount: BigDecimal.fromString(amount.toFixed(2)).toMoney(),
                });
              }}
            ></Stepper>
          </Stack>
          <Stack direction={'horizontal'} alignment={'center'} paddingVertical={'ExtraLarge'}>
            <Text variant={'headingSmall'} color={'TextSubdued'}>
              {currencyFormatter(charge.amount)}
            </Text>
          </Stack>
        </>
      )}
    </Stack>
  );
}
