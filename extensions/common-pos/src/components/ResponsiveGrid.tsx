import { useScreenSize } from '../providers/ScreenSizeProvider.js';
import { Children, ReactNode } from 'react';
import { Stack } from '@shopify/retail-ui-extensions-react';

/**
 * A responsive grid that changes the number of columns depending on the device.
 */
export function ResponsiveGrid({
  children,
  columns,
  smColumns = 1,
}: {
  smColumns?: number;
  columns: number;
  children?: ReactNode;
}) {
  const screenSize = useScreenSize();

  const actualColumns = {
    tablet: columns,
    mobile: smColumns,
  }[screenSize];

  const childrenArray = Children.toArray(children);
  const rows = batch(childrenArray, actualColumns);

  return (
    <Stack direction={'vertical'} alignment={'flex-start'} flex={1}>
      {rows.map((row, i) => (
        <Stack key={i} direction={'horizontal'} flex={1} flexChildren>
          {Array.from({ length: actualColumns }).map((_, j) => (
            <Stack direction={'horizontal'} flex={1} flexChildren>
              {row[j]}
            </Stack>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

function batch<T>(arr: T[], batchSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += batchSize) {
    result.push(arr.slice(i, i + batchSize));
  }
  return result;
}