import { Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';
import { useScreen } from '../hooks/use-screen.js';

export function Error() {
  const [error, setError] = useState('');

  const { Screen } = useScreen('Error', setError);

  return (
    <Screen title={'Error'}>
      <Stack direction="horizontal" alignment="center">
        <Text color="TextCritical" variant="headingLarge">
          Error: {error}
        </Text>
      </Stack>
    </Screen>
  );
}
