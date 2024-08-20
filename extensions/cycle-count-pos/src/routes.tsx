import { createRouter } from '@teifi-digital/pos-tools/router';
import { ScrollView } from '@shopify/retail-ui-extensions-react';
import { LocationSelector, LocationSelectorProps } from '@work-orders/common-pos/screens/LocationSelector.js';
import { CycleCount } from './screens/CycleCount.js';
import { Camera } from './screens/Camera.js';
import { VendorSelector } from './screens/VendorSelector.js';
import { ScreenPermissionBoundary } from '@work-orders/common-pos/components/ScreenPermissionBoundary.js';
import { Entry } from './screens/Entry.js';
import { CycleCountApplications } from './screens/CycleCountApplications.js';
import { ItemConfig } from './screens/ItemConfig.js';
import { ListPopup, ListPopupProps } from '@work-orders/common-pos/screens/ListPopup.js';
import { CycleCountProductSelector } from './screens/CycleCountProductSelector.js';
import { PlanCycleCount } from './screens/PlanCycleCount.js';

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
  CycleCount: {
    title: 'Cycle Count',
    Component: CycleCount,
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
  ItemConfig: {
    title: 'Item Config',
    Component: ItemConfig,
  },
  CycleCountApplications: {
    title: 'Cycle Count Applications',
    Component: CycleCountApplications,
  },
  ListPopup: {
    title: 'ListPopup',
    Component: (props: Omit<ListPopupProps, 'useRouter'>) => <ListPopup {...props} useRouter={useRouter} />,
  },
  CycleCountProductSelector: {
    title: 'Import Product',
    Component: CycleCountProductSelector,
  },
  PlanCycleCount: {
    title: 'Apply Cycle Count',
    Component: PlanCycleCount,
  },
});
