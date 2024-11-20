import { useEffect, useState } from 'react';
import {
  BlockStack,
  Box,
  Button,
  Card,
  DatePicker,
  Icon,
  InlineStack,
  Popover,
  Text,
  TextField,
} from '@shopify/polaris';
import { CalendarMajor, CancelMajor, CancelMinor, CancelSmallMinor } from '@shopify/polaris-icons';
import { TimePicker } from '@web/frontend/components/form/TimePicker.js';
import { DAY_IN_MS } from '@work-orders/common/time/constants.js';
import type { LabelledProps } from '@shopify/polaris/build/ts/src/components/Labelled/index.js';

export function DateTimeField({
  label,
  labelAction,
  value,
  onChange,
  disabled,
  requiredIndicator,
  min,
  max,
  readOnly,
}: {
  label: string;
  labelAction?: LabelledProps['action'];
  value: Date | undefined;
  onChange: (value: Date) => void;
  disabled?: boolean;
  requiredIndicator?: boolean;
  min?: Date;
  max?: Date;
  readOnly?: boolean;
}) {
  const [active, setActive] = useState(false);

  return (
    <Popover
      active={active}
      activator={
        <TextField
          label={label}
          labelAction={labelAction}
          autoComplete="off"
          value={value?.toLocaleString?.()}
          disabled={disabled}
          prefix={<Icon source={CalendarMajor} />}
          onFocus={() => setActive(true)}
          requiredIndicator={requiredIndicator}
          readOnly={readOnly}
        />
      }
      onClose={() => setActive(false)}
      preferredPosition="below"
      preferredAlignment="left"
    >
      <DateTimePicker
        min={min}
        max={max}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        onClose={() => setActive(false)}
      />
    </Popover>
  );
}

export function DateTimePicker({
  min,
  max,
  value,
  onChange,
  readOnly,
  onClose,
}: {
  min?: Date;
  max?: Date;
  value?: Date;
  onChange: (value: Date) => void;
  readOnly?: boolean;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (value) {
      setMonth(value.getMonth());
      setYear(value.getFullYear());
    }
  }, [value]);

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd" fontWeight="bold">
            Date Picker
          </Text>
          <Box padding="050">
            <Button variant="plain" icon={CancelSmallMinor} onClick={onClose} />
          </Box>
        </InlineStack>

        <DatePicker
          weekStartsOn={1}
          month={month}
          year={year}
          selected={value}
          onMonthChange={(month, year) => {
            setMonth(month);
            setYear(year);
          }}
          disableDatesAfter={readOnly ? new Date(0) : max ? new Date(max.getTime() + DAY_IN_MS) : undefined}
          disableDatesBefore={readOnly ? new Date(0) : min ? new Date(min.getTime() - DAY_IN_MS) : undefined}
          onChange={({ start }) => {
            onChange(
              new Date(
                start.getFullYear(),
                start.getMonth(),
                start.getDate(),
                // the type is wrong ... undefined is not supported, as arguments.length is used.... smh
                ...[value?.getHours(), value?.getMinutes()].filter(Boolean),
              ),
            );
          }}
        />

        <InlineStack align="center">
          <TimePicker
            readOnly={readOnly}
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
  );
}
