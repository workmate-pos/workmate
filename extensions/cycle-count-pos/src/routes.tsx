import { createRouter } from '@teifi-digital/pos-tools/router';
import { ScrollView } from '@shopify/retail-ui-extensions-react';
import { LocationSelector, LocationSelectorProps } from '@work-orders/common-pos/screens/LocationSelector.js';
import { Entry } from './screens/Entry.js';

export const { Router, useRouter } = createRouter(
  {
    title: 'Cycle Count',
    Component: () => {
      return (
        <ScrollView>
          <Entry />
        </ScrollView>
      );
    },
  },
  {
    LocationSelector: {
      title: 'Select Location',
      Component: (props: Omit<LocationSelectorProps, 'useRouter'>) => (
        <LocationSelector {...props} useRouter={useRouter} />
      ),
    },
  },
);
