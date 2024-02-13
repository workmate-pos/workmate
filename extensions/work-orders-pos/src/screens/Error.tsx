import { Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useScreen } from '../hooks/use-screen.js';

export function Error() {
  const [error, setError] = useState('');

  const { Screen, dismiss } = useScreen('Error', setError);

  return (
    <Screen title={'Error'} overrideNavigateBack={() => dismiss()}>
      <Stack direction="horizontal" alignment="center" paddingVertical={'ExtraLarge'}>
        <Text color="TextCritical" variant="headingLarge">
          {error}
        </Text>
      </Stack>
    </Screen>
  );
}
