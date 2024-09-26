import { useEffect, useState } from 'react';
import { BlockStack, Card, DatePicker, Icon, InlineStack, Popover, TextField } from '@shopify/polaris';
import { CalendarMajor } from '@shopify/polaris-icons';
import { TimePicker } from '@web/frontend/components/form/TimePicker.js';
import { DAY_IN_MS } from '@work-orders/common/time/constants.js';

export function DateTimeField({
  label,
  value,
  onChange,
  disabled,
  requiredIndicator,
  min,
  max,
}: {
  label: string;
  value: Date | undefined;
  onChange: (value: Date) => void;
  disabled?: boolean;
  requiredIndicator?: boolean;
  min?: Date;
  max?: Date;
}) {
  const [active, setActive] = useState(false);

  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (value) {
      setMonth(value.getMonth());
      setYear(value.getFullYear());
    }
  }, [value]);

  return (
    <Popover
      active={active}
      activator={
        <TextField
          label={label}
          autoComplete="off"
          value={value?.toLocaleString?.()}
          disabled={disabled}
          prefix={<Icon source={CalendarMajor} />}
          onFocus={() => setActive(true)}
          requiredIndicator={requiredIndicator}
        />
      }
      onClose={() => setActive(false)}
      preferredPosition="below"
      preferredAlignment="left"
      preferInputActivator={false}
    >
      <Card>
        <BlockStack gap="200">
          <DatePicker
            month={month}
            year={year}
            selected={value}
            onMonthChange={(month, year) => {
              setMonth(month);
              setYear(year);
            }}
            disableDatesAfter={max ? new Date(max.getTime() + DAY_IN_MS) : undefined}
            disableDatesBefore={min ? new Date(min.getTime() - DAY_IN_MS) : undefined}
            onChange={({ start }) => {
              onChange(
                new Date(
                  start.getFullYear(),
                  start.getMonth(),
                  start.getDate(),
                  value?.getHours(),
                  value?.getMinutes(),
                ),
              );
            }}
          />

          <InlineStack align="center">
            <TimePicker
              min={
                min &&
                min.getFullYear() === value?.getFullYear() &&
                min.getMonth() === value?.getMonth() &&
                min.getDate() === value?.getDate()
                  ? { hours: min.getHours(), minutes: min.getMinutes() }
                  : undefined
              }
              max={
                max &&
                max.getFullYear() === value?.getFullYear() &&
                max.getMonth() === value?.getMonth() &&
                max.getDate() === value?.getDate()
                  ? { hours: max.getHours(), minutes: max.getMinutes() }
                  : undefined
              }
              hours={value?.getHours() ?? new Date().getHours()}
              minutes={value?.getMinutes() ?? new Date().getMinutes()}
              onChange={(hours, minutes) =>
                onChange(
                  new Date(
                    value?.getFullYear() ?? new Date().getFullYear(),
                    value?.getMonth() ?? new Date().getMonth(),
                    value?.getDate() ?? new Date().getDate(),
                    hours,
                    minutes,
                  ),
                )
              }
            />
          </InlineStack>
        </BlockStack>
      </Card>
    </Popover>
  );
}
