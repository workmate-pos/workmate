import { CreateWorkOrder } from '@web/schemas/generated/create-work-order.js';
import { ReactNode, useState } from 'react';
import { BlockStack, Box, InlineStack, Spinner, Tabs, Text, TextField } from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useSettingsQuery } from '@work-orders/common/queries/use-settings-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';
import { BigDecimal, Decimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { DiscriminatedUnionOmit } from '@work-orders/common/types/DiscriminatedUnionOmit.js';
import { MoneyField } from '@web/frontend/components/MoneyField.js';
import { DecimalField } from '@web/frontend/components/DecimalField.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';

const segmentToggleName = {
  'fixed-price-labour': 'allowFixedPriceLabour',
  'hourly-labour': 'allowHourlyLabour',
} as const;

type TabId = 'none' | 'hourly-labour' | 'fixed-price-labour';

export function SegmentedChargeConfig({
  types,
  charge,
  setCharge,
  disabled,
  defaultHourlyRate,
}: {
  types: TabId[];
  charge: DiscriminatedUnionOmit<
    CreateWorkOrder['charges'][number],
    'uuid' | 'workOrderItemUuid' | 'employeeId'
  > | null;
  setCharge: (
    charge: DiscriminatedUnionOmit<
      CreateWorkOrder['charges'][number],
      'uuid' | 'workOrderItemUuid' | 'employeeId'
    > | null,
  ) => void;
  disabled?: boolean;
  defaultHourlyRate?: Money;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const currencyFormatter = useCurrencyFormatter({ fetch });

  const settingsQuery = useSettingsQuery({ fetch });
  const settings = settingsQuery.data?.settings;

  if (settingsQuery.isError) {
    return (
      <Box paddingBlock={'400'} paddingInline={'400'}>
        <Text as={'p'} tone={'critical'}>
          {extractErrorMessage(settingsQuery.error, 'An error occurred while loading settings')}
        </Text>
      </Box>
    );
  }

  if (!settings) {
    return <Spinner />;
  }

  const getTabDisableReason = (tabId: TabId): string | null => {
    if (displayedTabs[selectedTab]?.id === tabId) return null;
    if (disabled) return '';
    if (charge?.removeLocked) return 'This charge cannot be removed';
    // TODO: Account for other locks
    const toggleName = tabId === 'none' ? null : segmentToggleName[tabId];
    if (!toggleName) return null;
    if (!settings.workOrders.charges[toggleName]) return 'This charge type has been disabled';
    return null;
  };

  const tabs: {
    id: TabId;
    name: string;
    tab: ReactNode;
    onEnter: () => void;
  }[] = [
    {
      id: 'none',
      name: 'None',
      tab: null,
      onEnter: () => setCharge(null),
    },
    {
      id: 'hourly-labour',
      name: 'Hourly',
      tab: (
        <>
          {charge?.type === 'hourly-labour' && (
            <>
              <MoneyField
                label={'Hourly Rate'}
                autoComplete="off"
                disabled={disabled}
                readOnly={charge.rateLocked}
                value={charge.rate}
                min={0}
                onChange={rate => setCharge({ ...charge, rate: rate as Money })}
                labelAction={
                  defaultHourlyRate !== undefined &&
                  !disabled &&
                  !charge.rateLocked &&
                  !BigDecimal.fromMoney(defaultHourlyRate).equals(BigDecimal.fromMoney(charge.rate))
                    ? {
                        content: 'Reset',
                        onAction: () =>
                          setCharge({
                            ...charge,
                            rate: defaultHourlyRate,
                          }),
                      }
                    : undefined
                }
              />

              <DecimalField
                label={'Hours'}
                autoComplete="off"
                disabled={disabled}
                readOnly={charge.hoursLocked}
                value={charge.hours}
                min={0}
                decimals={2}
                onChange={hours => setCharge({ ...charge, hours: hours as Decimal })}
              />

              <InlineStack gap={'200'} align={'center'} blockAlign={'center'}>
                <Text as={'p'} variant={'bodyMd'} fontWeight={'semibold'}>
                  {charge.hours} hours × {currencyFormatter(charge.rate)}/hour ={' '}
                  {currencyFormatter(
                    BigDecimal.fromDecimal(charge.hours).multiply(BigDecimal.fromMoney(charge.rate)).toMoney(),
                  )}
                </Text>
              </InlineStack>
            </>
          )}
        </>
      ),
      onEnter: () =>
        setCharge({
          type: 'hourly-labour',
          name: charge?.name ?? (settings.workOrders.charges.defaultLabourLineItemName || 'Labour'),
          rate: getTotalPriceForCharges(charge ? [charge] : []),
          hours: BigDecimal.ONE.toDecimal(),
          rateLocked: false,
          hoursLocked: false,
          removeLocked: false,
        }),
    },
    {
      id: 'fixed-price-labour',
      name: 'Fixed Price',
      tab: (
        <>
          {charge?.type === 'fixed-price-labour' && (
            <>
              <MoneyField
                label={'Price'}
                autoComplete="off"
                disabled={disabled}
                readOnly={charge.amountLocked}
                value={charge.amount}
                min={0}
                onChange={amount => setCharge({ ...charge, amount: amount as Money })}
              />

              <InlineStack gap={'200'} align={'center'} blockAlign={'center'}>
                <Text as={'p'} variant={'bodyMd'} fontWeight={'semibold'}>
                  {currencyFormatter(charge.amount)}
                </Text>
              </InlineStack>
            </>
          )}
        </>
      ),
      onEnter: () =>
        setCharge({
          type: 'fixed-price-labour',
          name: charge?.name ?? (settings.workOrders.charges.defaultLabourLineItemName || 'Labour'),
          amount: getTotalPriceForCharges(charge ? [charge] : []),
          amountLocked: false,
          removeLocked: false,
        }),
    },
  ];

  const displayedTabs = tabs.filter(tab => types.includes(tab.id));

  const [selectedTab, setSelectedTab] = useState(
    displayedTabs.findIndex(tab => tab.id === (charge?.type ?? 'none')) ?? 0,
  );

  if (types.length === 0 || (types.length === 1 && types[0] === 'none')) {
    return <Text as={'p'}>You cannot configure any types of charges</Text>;
  }

  return (
    <>
      <Tabs
        fitted
        tabs={displayedTabs.map((tab, i) => ({
          id: tab.id,
          content: tab.name,
          disabled: getTabDisableReason(tab.id) !== null,
          selected: selectedTab === i,
        }))}
        selected={selectedTab}
        onSelect={tab => {
          displayedTabs[tab]?.onEnter();
          setSelectedTab(tab);
        }}
      >
        <Box paddingBlock={'400'} paddingInline={'400'}>
          <BlockStack gap={'400'}>
            {charge && (
              <TextField
                label={'Labour Name'}
                autoComplete="off"
                requiredIndicator
                value={charge.name}
                onChange={name =>
                  setCharge(
                    (() => {
                      if (charge.type !== 'fixed-price-labour') {
                        return { ...charge, name };
                      }

                      if (charge.type === 'fixed-price-labour') {
                        return { ...charge, name };
                      }

                      return charge satisfies never;
                    })(),
                  )
                }
                error={charge.name.length === 0 ? 'Labour name is required' : undefined}
                disabled={disabled}
              />
            )}

            {displayedTabs[selectedTab]?.tab}
          </BlockStack>
        </Box>
      </Tabs>

      {toast}
    </>
  );
}
