import { Box, RangeSlider, RangeSliderProps, Text } from '@shopify/polaris';
import React from 'react';

/**
 * Range slider that displays the current range properly
 */
export function AnnotatedRangeSlider({
  formatter = String,
  ...props
}: RangeSliderProps & { formatter?: (value: number) => string }) {
  const lower = Array.isArray(props.value) ? props.value[0] : props.value;
  const upper = Array.isArray(props.value) ? props.value[1] : props.value;

  return (
    <Box paddingBlockEnd="500" paddingBlockStart="500">
      <RangeSlider {...props} />
      <Text as="p" fontWeight="semibold" variant="bodyLg" alignment="center">
        {formatter(lower)} &mdash; {formatter(upper)}
      </Text>
    </Box>
  );
}
