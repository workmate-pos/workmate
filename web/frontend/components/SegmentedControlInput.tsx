import { RangeSlider, TabProps, Tabs, TextField, VerticalStack, Text, Box } from '@shopify/polaris';
import { useState } from 'react';

export type Segment = {
  name: string;
  valueType: ValueType;
};

type ValueType =
  | {
      type: 'number';
      min?: number;
      max?: number;
      step?: number;
      label: string;
      prefix?: string;
      suffix?: string;
    }
  | {
      type: 'numberRange';
      min: number;
      max: number;
      step?: number;
      formatter?: (value: number) => string;
      label: string;
    };

export function SegmentedValueSelector({ segments }: { segments: Segment[] }) {
  const [selected, setSelected] = useState(0);
  const tabs: TabProps[] = segments.map(segment => ({ id: segment.name, content: segment.name }));

  const selectedTabProps = segments[selected].valueType;

  return (
    <Tabs tabs={tabs} fitted selected={selected} onSelect={setSelected}>
      <Box padding="800">
        <TabContent {...selectedTabProps} />
      </Box>
    </Tabs>
  );
}

function TabContent(props: ValueType) {
  if (props.type === 'number') {
    return <NumberSelector {...props} />;
  }

  if (props.type === 'numberRange') {
    return <NumberRangeSelector {...props} />;
  }

  throw new Error('Unknown type');
}

function NumberSelector({ min, max, label, prefix, suffix, step = 1 }: Omit<ValueType & { type: 'number' }, 'type'>) {
  const [value, setValue] = useState(0);

  return (
    <TextField
      type="number"
      step={step}
      label={label}
      min={min}
      max={max}
      prefix={prefix}
      suffix={suffix}
      autoComplete="off"
      value={String(value)}
      onChange={value => setValue(Number(value))}
    />
  );
}

function NumberRangeSelector({
  min,
  max,
  step = 1,
  formatter = String,
  label,
}: Omit<ValueType & { type: 'numberRange' }, 'type'>) {
  const [value, setValue] = useState<[number, number]>([0, 10]);

  return (
    <VerticalStack gap="400">
      <Text as="p" variant="bodyLg" fontWeight="semibold" alignment="center">
        {formatter(value[0])} &mdash; {formatter(value[1])}
      </Text>
      <RangeSlider
        label={label}
        value={value}
        onChange={(value: [number, number]) => setValue(value)}
        step={step}
        min={min}
        max={max}
        prefix={formatter(min)}
        suffix={formatter(max)}
      />
    </VerticalStack>
  );
}
