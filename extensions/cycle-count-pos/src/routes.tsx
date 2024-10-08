import { createRouter } from '@teifi-digital/pos-tools/router';
import { ScrollView } from '@shopify/ui-extensions-react/point-of-sale';
import { LocationSelector, LocationSelectorProps } from '@work-orders/common-pos/screens/selector/LocationSelector.js';
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
import { StatusSelector } from './screens/StatusSelector.js';
import {
  MultiEmployeeSelector,
  MultiEmployeeSelectorProps,
} from '@work-orders/common-pos/screens/selector/MultiEmployeeSelector.js';
import { EmployeeSelector, EmployeeSelectorProps } from '@work-orders/common-pos/screens/selector/EmployeeSelector.js';
import { Filters } from './screens/Filters.js';

export const { Router, useRouter } = createRouter({
  Entry: {
    title: 'Cycle count',
    Component: () => (
      <ScrollView>
        <ScreenPermissionBoundary permissions={['cycle_count']}>
          <Entry />
        </ScreenPermissionBoundary>
      </ScrollView>
    ),
  },
  CycleCount: {
    title: 'Cycle count',
    Component: CycleCount,
  },
  LocationSelector: {
    title: 'Select location',
    Component: (props: Omit<LocationSelectorProps, 'useRouter'>) => (
      <LocationSelector {...props} useRouter={useRouter} />
    ),
  },
  Camera: {
    title: 'Camera',
    Component: Camera,
  },
  VendorSelector: {
    title: 'Select vendor',
    Component: VendorSelector,
  },
  ItemConfig: {
    title: 'Item config',
    Component: ItemConfig,
  },
  CycleCountApplications: {
    title: 'Cycle count applications',
    Component: CycleCountApplications,
  },
  ListPopup: {
    title: 'ListPopup',
    Component: (props: Omit<ListPopupProps, 'useRouter'>) => <ListPopup {...props} useRouter={useRouter} />,
  },
  CycleCountProductSelector: {
    title: 'Import product',
    Component: CycleCountProductSelector,
  },
  PlanCycleCount: {
    title: 'Apply cycle count',
    Component: PlanCycleCount,
  },
  StatusSelector: {
    title: 'Select status',
    Component: StatusSelector,
  },
  EmployeeSelector: {
    title: 'Select employees',
    Component: (props: Omit<EmployeeSelectorProps, 'useRouter'>) => (
      <EmployeeSelector {...props} useRouter={useRouter} />
    ),
  },
  MultiEmployeeSelector: {
    title: 'Select employees',
    Component: (props: Omit<MultiEmployeeSelectorProps, 'useRouter'>) => (
      <MultiEmployeeSelector {...props} useRouter={useRouter} />
    ),
  },
  Filters: {
    title: 'Filters',
    Component: Filters,
  },
});
