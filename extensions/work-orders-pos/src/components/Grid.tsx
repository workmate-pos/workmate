import { ReactNode, Children } from 'react';
import { Stack } from '@shopify/retail-ui-extensions-react';

export function Grid({ children, columns }: { children: ReactNode; columns: number }) {
  const rows = [];

  const childArr = Children.toArray(children);
  for (let i = 0; i < childArr.length; i += columns) {
    rows.push(childArr.slice(i, i + columns));
  }

  return (
    <Stack direction={'vertical'}>
      {rows.map(row => (
        <Stack direction={'horizontal'} flexChildren>
          {row}
        </Stack>
      ))}
    </Stack>
  );
}
