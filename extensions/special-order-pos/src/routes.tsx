import { createRouter } from '@teifi-digital/pos-tools/router';
import { ScreenPermissionBoundary } from '@work-orders/common-pos/components/ScreenPermissionBoundary.js';
import { ListPopup, ListPopupProps } from '@work-orders/common-pos/screens/ListPopup.js';
import { Entry } from './screens/Entry.js';
import { OrderStateSelector } from './screens/selectors/OrderStateSelector.js';
import { PurchaseOrderStateSelector } from './screens/selectors/PurchaseOrderStateSelector.js';
import { VendorSelector, VendorSelectorProps } from '@work-orders/common-pos/screens/selector/VendorSelector.js';
import { CustomerSelector, CustomerSelectorProps } from '@work-orders/common-pos/screens/selector/CustomerSelector.js';
import { LocationSelector, LocationSelectorProps } from '@work-orders/common-pos/screens/selector/LocationSelector.js';
import { SpecialOrderLineItemConfig } from './screens/special-order/SpecialOrderLineItemConfig.js';
import { SpecialOrder } from './screens/special-order/SpecialOrder.js';
import { CompanySelector, CompanySelectorProps } from '@work-orders/common-pos/screens/selector/CompanySelector.js';
import {
  CompanyLocationSelector,
  CompanyLocationSelectorProps,
} from '@work-orders/common-pos/screens/selector/CompanyLocationSelector.js';
import { SpecialOrderFilters } from './screens/special-order/SpecialOrderFilters.js';
import {
  SpecialOrderNotificationConfig,
  SpecialOrderNotificationConfigProps,
} from '@work-orders/common-pos/screens/special-orders/SpecialOrderNotificationConfig.js';
import {
  SpecialOrderNotificationPicker,
  SpecialOrderNotificationPickerProps,
} from '@work-orders/common-pos/screens/special-orders/SpecialOrderNotificationPicker.js';
import { SpecialOrderNotificationHistory } from './screens/special-order/SpecialOrderNotificationHistory.js';

export const { Router, useRouter } = createRouter({
  Entry: {
    title: 'Special Orders',
    Component: () => (
      <ScreenPermissionBoundary permissions={['read_special_orders']}>
        <Entry />
      </ScreenPermissionBoundary>
    ),
  },
  SpecialOrder: {
    title: 'Special Order',
    Component: SpecialOrder,
  },
  SpecialOrderLineItemConfig: {
    title: 'Line item config',
    Component: SpecialOrderLineItemConfig,
  },
  ListPopup: {
    title: 'ListPopup',
    Component: <ID extends string = string>(props: Omit<ListPopupProps<ID>, 'useRouter'>) => (
      <ListPopup {...props} useRouter={useRouter} />
    ),
  },
  // TODO: have ListPopup-based standard components like this all in common pos
  CustomerSelector: {
    title: 'Select Customer',
    Component: (props: Omit<CustomerSelectorProps, 'useRouter'>) => (
      <CustomerSelector {...props} useRouter={useRouter} />
    ),
  },
  LocationSelector: {
    title: 'Select Location',
    Component: (props: Omit<LocationSelectorProps, 'useRouter'>) => (
      <LocationSelector {...props} useRouter={useRouter} />
    ),
  },
  VendorSelector: {
    title: 'Select Vendor',
    Component: (props: Omit<VendorSelectorProps, 'useRouter'>) => <VendorSelector {...props} useRouter={useRouter} />,
  },
  OrderStateSelector: {
    title: 'Select Order State',
    Component: OrderStateSelector,
  },
  PurchaseOrderStateSelector: {
    title: 'Select Purchase Order State',
    Component: PurchaseOrderStateSelector,
  },
  CompanySelector: {
    title: 'Select Company',
    Component: (props: Omit<CompanySelectorProps, 'useRouter'>) => <CompanySelector {...props} useRouter={useRouter} />,
  },
  CompanyLocationSelector: {
    title: 'Select Company Location',
    Component: (props: Omit<CompanyLocationSelectorProps, 'useRouter'>) => (
      <CompanyLocationSelector {...props} useRouter={useRouter} />
    ),
  },
  SpecialOrderFilters: {
    title: 'Special Order Filters',
    Component: SpecialOrderFilters,
  },

  SpecialOrderNotificationConfig: {
    title: 'Send Notification',
    Component: (props: Omit<SpecialOrderNotificationConfigProps, 'useRouter'>) => (
      <SpecialOrderNotificationConfig {...props} useRouter={useRouter} />
    ),
  },
  SpecialOrderNotificationPicker: {
    title: 'Notification Picker',
    Component: (props: Omit<SpecialOrderNotificationPickerProps, 'useRouter'>) => (
      <SpecialOrderNotificationPicker {...props} useRouter={useRouter} />
    ),
  },
  SpecialOrderNotificationHistory: {
    title: 'Notification History',
    Component: SpecialOrderNotificationHistory,
  },
});
