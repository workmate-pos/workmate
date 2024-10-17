import { SegmentedControl, Text, TextField, Stack, Selectable } from '@shopify/ui-extensions-react/point-of-sale';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import type { ShopSettings } from '@web/services/settings/schema.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common-pos/hooks/use-currency-formatter.js';
import { CreateWorkOrderCharge } from '../types.js';
import { FormMoneyField } from '@teifi-digital/pos-tools/components/form/FormMoneyField.js';
import { FormDecimalField } from '@teifi-digital/pos-tools/components/form/FormDecimalField.js';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';
import { Segment } from '@shopify/ui-extensions/point-of-sale';

type SegmentId = CreateWorkOrderCharge['type'] | 'none';

const segmentLabels: Record<SegmentId, string> = {
  none: 'None',
  'fixed-price-labour': 'Fixed price',
  'hourly-labour': 'Hourly',
};

const segmentToggleName: Partial<Record<SegmentId, keyof ShopSettings['workOrders']['charges']>> = {
  'fixed-price-labour': 'allowFixedPriceLabour',
  'hourly-labour': 'allowHourlyLabour',
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
    if (charge?.removeLocked) return false;
    const toggleName = segmentToggleName[type];
    if (!toggleName) return true;
    return settings.workOrders.charges[toggleName];
  };

  const segments = types.map<Segment>(type => ({
    id: type,
    label: segmentLabels[type],
    disabled: disabled || !shouldShowSegment(type),
  }));

  const selectedSegmentId = charge?.type ?? 'none';

  const canResetLabourRate =
    defaultHourlyRate &&
    charge?.type === 'hourly-labour' &&
    !BigDecimal.fromMoney(defaultHourlyRate).equals(BigDecimal.fromMoney(charge.rate)) &&
    !charge.rateLocked;

  const onSelect = (id: SegmentTypes[number]) => {
    switch (id) {
      case 'none': {
        onChange(null as any);
        break;
      }

      case 'fixed-price-labour': {
        const fixedPriceLabour: ChargeType<'fixed-price-labour'> = {
          type: 'fixed-price-labour',
          name: charge?.name ?? (settings.workOrders.charges.defaultLabourLineItemName || 'Labour'),
          amount: getTotalPriceForCharges(charge ? [charge] : []),
          amountLocked: false,
          removeLocked: false,
        };

        onChange(fixedPriceLabour as any);
        break;
      }

      case 'hourly-labour': {
        const hourlyLabour: ChargeType<'hourly-labour'> = {
          type: 'hourly-labour',
          name: charge?.name ?? (settings.workOrders.charges.defaultLabourLineItemName || 'Labour'),
          rate: getTotalPriceForCharges(charge ? [charge] : []),
          hours: BigDecimal.ONE.toDecimal(),
          rateLocked: false,
          hoursLocked: false,
          removeLocked: false,
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
      {segments.length > 1 && (
        <SegmentedControl
          segments={segments}
          selected={selectedSegmentId}
          onSelect={selectedSegmentId => onSelect(selectedSegmentId as SegmentId)}
        />
      )}
      {charge && (
        <TextField
          label={'Labour name'}
          value={charge.name}
          onChange={(name: string) => onChange({ ...charge, name })}
          isValid={charge.name.length > 0}
          errorMessage={charge.name.length === 0 ? 'Labour name is required' : undefined}
          disabled={disabled}
        />
      )}
      {charge?.type === 'hourly-labour' && (
        <>
          <Stack direction={'horizontal'} alignment={'flex-end'}>
            {defaultHourlyRate && (
              <Selectable
                disabled={disabled || !canResetLabourRate}
                onPress={() => onChange({ ...charge, rate: defaultHourlyRate })}
              >
                <Text color={canResetLabourRate ? 'TextInteractive' : 'TextSubdued'}>Reset</Text>
              </Selectable>
            )}
          </Stack>

          <FormMoneyField
            label={'Hourly rate'}
            disabled={disabled || charge.rateLocked}
            value={charge.rate}
            min={0}
            onChange={rate => onChange({ ...charge, rate })}
            decimals={2}
          />

          <FormDecimalField
            label={'Hours'}
            disabled={disabled || charge.hoursLocked}
            value={charge.hours}
            min={0}
            onChange={hours => onChange({ ...charge, hours })}
          />

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
          <FormMoneyField
            label={'Price'}
            disabled={disabled || charge.amountLocked}
            value={charge.amount}
            min={0}
            onChange={amount => onChange({ ...charge, amount })}
            decimals={2}
          />

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
