import { StatusSelector } from './screens/popups/StatusSelector.js';
import { ScreenPermissionBoundary } from '@work-orders/common-pos/components/ScreenPermissionBoundary.js';
import { Entry } from './screens/Entry.js';
import { EmployeeSelector } from './screens/popups/EmployeeSelector.js';
import { ProductSelector } from './screens/popups/ProductSelector.js';
import { createRouter } from '@teifi-digital/pos-tools/router';
import { OrderPreview } from './screens/popups/OrderPreview.js';
import { CustomerSelector } from './screens/popups/CustomerSelector.js';
import { WorkOrderSaved } from './screens/popups/WorkOrderSaved.js';
import { ServiceSelector } from './screens/popups/ServiceSelector.js';
import { ProductLineItemConfig } from './screens/popups/ProductLineItemConfig.js';
import { EmployeeLabourConfig } from './screens/popups/EmployeeLabourConfig.js';
import { LabourLineItemConfig } from './screens/popups/LabourLineItemConfig.js';
import { WorkOrder } from './screens/WorkOrder.js';
import { ImportOrderSelector } from './screens/ImportOrderSelector.js';
import { PaymentOverview } from './screens/popups/PaymentOverview.js';

export const { Router, useRouter } = createRouter(
  {
    title: 'Work Orders',
    Component: () => {
      return (
        <ScreenPermissionBoundary permissions={['read_settings', 'read_work_orders', 'read_employees']}>
          <Entry />
        </ScreenPermissionBoundary>
      );
    },
  },
  {
    EmployeeSelector: {
      title: 'Select Employee',
      Component: EmployeeSelector,
    },
    ProductSelector: {
      title: 'Select Product',
      Component: ProductSelector,
    },
    OrderPreview: {
      title: 'Select Product',
      Component: OrderPreview,
    },
    StatusSelector: {
      title: 'Select Status',
      Component: StatusSelector,
    },
    CustomerSelector: {
      title: 'Select Customer',
      Component: CustomerSelector,
    },
    // TODO: Re-add if possible, though difficult when using multiple orders.
    // DiscountSelector: {
    //   title: 'Select Discount',
    //   Component: DiscountSelector,
    // },
    WorkOrderSaved: {
      title: 'Work order saved',
      Component: WorkOrderSaved,
    },
    ServiceSelector: {
      title: 'Select Service',
      Component: ServiceSelector,
    },
    ProductLineItemConfig: {
      title: 'Line item config',
      Component: ProductLineItemConfig,
    },
    EmployeeLabourConfig: {
      title: 'Employee config',
      Component: EmployeeLabourConfig,
    },
    LabourLineItemConfig: {
      title: 'Labour line item config',
      Component: LabourLineItemConfig,
    },
    WorkOrder: {
      title: 'Work order',
      Component: WorkOrder,
    },
    ImportOrderSelector: {
      title: 'Import Order',
      Component: ImportOrderSelector,
    },
    PaymentOverview: {
      title: 'Payments',
      Component: PaymentOverview,
    },
  },
);
