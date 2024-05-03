import { createRouter } from '@teifi-digital/pos-tools/router';
import { ScrollView } from '@shopify/retail-ui-extensions-react';
import { LocationSelector, LocationSelectorProps } from '@work-orders/common-pos/screens/LocationSelector.js';
import { Entry } from './screens/Entry.js';
import { Camera } from './screens/Camera.js';
import { VendorSelector } from './screens/VendorSelector.js';
import { ProductConfig } from './screens/ProductConfig.js';
import { ScreenPermissionBoundary } from '@work-orders/common-pos/components/ScreenPermissionBoundary.js';

export const { Router, useRouter } = createRouter({
  Entry: {
    title: 'Cycle Count',
    Component: () => {
      return (
        <ScrollView>
          <ScreenPermissionBoundary permissions={['cycle_count']}>
            <Entry />
          </ScreenPermissionBoundary>
        </ScrollView>
      );
    },
  },
  LocationSelector: {
    title: 'Select Location',
    Component: (props: Omit<LocationSelectorProps, 'useRouter'>) => (
      <LocationSelector {...props} useRouter={useRouter} />
    ),
  },
  Camera: {
    title: 'Camera',
    Component: Camera,
  },
  VendorSelector: {
    title: 'Select Vendor',
    Component: VendorSelector,
  },
  ProductConfig: {
    title: 'Product Config',
    Component: ProductConfig,
  },
});
