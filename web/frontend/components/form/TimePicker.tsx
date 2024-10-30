import { InlineStack, Select, TextField } from '@shopify/polaris';

export function TimePicker({
  readOnly,
  hours,
  minutes,
  onChange,
  min,
  max,
}: {
  readOnly?: boolean;
  hours: number;
  minutes: number;
  onChange: (hours: number, minutes: number) => void;
  min?: { hours: number; minutes: number };
  max?: { hours: number; minutes: number };
}) {
  const is12HourClock = Intl.DateTimeFormat().resolvedOptions().hour12;
  const displayHours = is12HourClock ? hours % 12 || 12 : hours;

  const minHours = Math.max(min?.hours ?? 0, 0);
  const minMinutes = hours === minHours ? Math.max(min?.minutes ?? 0, 0) : 0;

  const maxHours = Math.min(max?.hours ?? 23, 23);
  const maxMinutes = hours === maxHours ? Math.min(max?.minutes ?? 59, 59) : 59;

  const displayMinHours = is12HourClock ? minHours % 12 || 12 : minHours;
  const displayMaxHours = is12HourClock ? maxHours % 12 || 12 : maxHours;

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  return (
    <InlineStack gap="050">
      <TextField
        readOnly={readOnly}
        label={'Hours'}
        autoComplete="off"
        type="number"
        min={displayMinHours}
        max={displayMaxHours}
        value={displayHours.toString()}
        onChange={value => onChange(clamp(Number(value), displayMinHours, displayMaxHours), minutes)}
        requiredIndicator
      />
      <TextField
        readOnly={readOnly}
        label={'Minutes'}
        autoComplete="off"
        type="number"
        min={minMinutes}
        max={maxMinutes}
        value={minutes.toString()}
        onChange={value => onChange(hours, clamp(Number(value), minMinutes, maxMinutes))}
        requiredIndicator
      />
      {is12HourClock && (
        <Select
          requiredIndicator
          label={'AM/PM'}
          options={['AM', 'PM']}
          value={hours > 12 ? 'PM' : 'AM'}
          onChange={selected => {
            if (selected === 'AM') {
              onChange(hours - 12, minutes);
            } else {
              onChange(hours + 12, minutes);
            }
          }}
          disabled={readOnly}
        />
      )}
    </InlineStack>
  );
}
