import { Screen, Stack, Text } from '@shopify/retail-ui-extensions-react';
import { useState } from 'react';

export function Error() {
  const [error, setError] = useState('');

  return (
    <Screen
      name="Error"
      title="Error"
      onReceiveParams={params => {
        setError(params.error);
      }}
    >
      <Stack direction="horizontal" alignment="center">
        <Text color="TextCritical" variant="headingLarge">
          {error}
        </Text>
      </Stack>
    </Screen>
  );
}
