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
import { TaskInfo, TaskInfoProps } from '@work-orders/common-pos/screens/tasks/TaskInfo.js';
import {
  MultiEmployeeSelector,
  MultiEmployeeSelectorProps,
} from '@work-orders/common-pos/screens/selector/MultiEmployeeSelector.js';
import { TaskModal, TaskModalProps } from '@work-orders/common-pos/screens/tasks/TaskModal.js';

export const { Router, useRouter } = createRouter({
  Entry: {
    title: 'Special orders',
    Component: () => (
      <ScreenPermissionBoundary permissions={['read_special_orders']}>
        <Entry />
      </ScreenPermissionBoundary>
    ),
  },
  SpecialOrder: {
    title: 'Special order',
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
    title: 'Select customer',
    Component: (props: Omit<CustomerSelectorProps, 'useRouter'>) => (
      <CustomerSelector {...props} useRouter={useRouter} />
    ),
  },
  LocationSelector: {
    title: 'Select location',
    Component: (props: Omit<LocationSelectorProps, 'useRouter'>) => (
      <LocationSelector {...props} useRouter={useRouter} />
    ),
  },
  VendorSelector: {
    title: 'Select vendor',
    Component: (props: Omit<VendorSelectorProps, 'useRouter'>) => <VendorSelector {...props} useRouter={useRouter} />,
  },
  OrderStateSelector: {
    title: 'Select order state',
    Component: OrderStateSelector,
  },
  PurchaseOrderStateSelector: {
    title: 'Select purchase order state',
    Component: PurchaseOrderStateSelector,
  },
  CompanySelector: {
    title: 'Select company',
    Component: (props: Omit<CompanySelectorProps, 'useRouter'>) => <CompanySelector {...props} useRouter={useRouter} />,
  },
  CompanyLocationSelector: {
    title: 'Select company location',
    Component: (props: Omit<CompanyLocationSelectorProps, 'useRouter'>) => (
      <CompanyLocationSelector {...props} useRouter={useRouter} />
    ),
  },
  SpecialOrderFilters: {
    title: 'Special order filters',
    Component: SpecialOrderFilters,
  },

  TaskInfo: {
    title: 'Task',
    Component: (props: Omit<TaskInfoProps, 'useRouter'>) => <TaskInfo {...props} useRouter={useRouter} />,
  },
  MultiEmployeeSelector: {
    title: 'Select employee',
    Component: (props: Omit<MultiEmployeeSelectorProps, 'useRouter'>) => (
      <MultiEmployeeSelector {...props} useRouter={useRouter} />
    ),
  },
  TaskModal: {
    title: 'Task',
    Component: (props: Omit<TaskModalProps, 'useRouter'>) => <TaskModal {...props} useRouter={useRouter} />,
  },
});
