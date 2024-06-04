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
import { ItemConfig } from './screens/popups/ItemConfig.js';
import { EmployeeLabourConfig } from './screens/popups/EmployeeLabourConfig.js';
import { ItemChargeConfig } from './screens/popups/ItemChargeConfig.js';
import { WorkOrder } from './screens/WorkOrder.js';
import { ImportOrderSelector } from './screens/ImportOrderSelector.js';
import { PaymentOverview } from './screens/popups/PaymentOverview.js';
import {
  CustomFieldConfig,
  CustomFieldConfigProps,
} from '@work-orders/common-pos/screens/custom-fields/CustomFieldConfig.js';
import { ImportPreset, ImportPresetProps } from '@work-orders/common-pos/screens/custom-fields/ImportPreset.js';
import { SavePreset, SavePresetProps } from '@work-orders/common-pos/screens/custom-fields/SavePreset.js';
import { ProductCreator, ProductCreatorProps } from '@work-orders/common-pos/screens/product-creator/ProductCreator.js';
import { PrintOverview } from './screens/popups/PrintOverview.js';
import {
  CustomFieldFilterConfig,
  CustomFieldFilterConfigProps,
} from '@work-orders/common-pos/screens/custom-fields/CustomFieldFilterConfig.js';
import { DiscountSelector } from './screens/popups/DiscountSelector.js';
import { PaymentStatusSelector } from './screens/popups/PaymentStatusSelector.js';
import { OverdueStatusSelector } from './screens/popups/OverdueStatusSelector.js';
import { PurchaseOrderStatusSelector } from './screens/popups/PurchaseOrderStatusSelector.js';
import { ItemSelector } from './screens/popups/ItemSelector.js';
import { PermissionNode } from '@web/services/db/queries/generated/employee.sql.js';
import { NewWorkOrder } from './screens/NewWorkOrder.js';

const requiredPermissions: PermissionNode[] = ['read_settings', 'read_work_orders', 'read_employees'];

export const { Router, useRouter } = createRouter({
  Entry: {
    title: 'Work Orders',
    Component: () => (
      <ScreenPermissionBoundary permissions={requiredPermissions}>
        <Entry />
      </ScreenPermissionBoundary>
    ),
  },
  WorkOrder: {
    title: 'Work Order',
    Component: WorkOrder,
  },
  NewWorkOrder: {
    title: 'New Work Order',
    Component: () => (
      <ScreenPermissionBoundary permissions={requiredPermissions}>
        <NewWorkOrder />
      </ScreenPermissionBoundary>
    ),
  },
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
  PaymentStatusSelector: {
    title: 'Select Payment Status',
    Component: PaymentStatusSelector,
  },
  OverdueStatusSelector: {
    title: 'Select Overdue Status',
    Component: OverdueStatusSelector,
  },
  PurchaseOrderStatusSelector: {
    title: 'Select Purchase Order Status',
    Component: PurchaseOrderStatusSelector,
  },
  CustomerSelector: {
    title: 'Select Customer',
    Component: CustomerSelector,
  },
  DiscountSelector: {
    title: 'Select Discount',
    Component: DiscountSelector,
  },
  WorkOrderSaved: {
    title: 'Work order saved',
    Component: WorkOrderSaved,
  },
  ServiceSelector: {
    title: 'Select Service',
    Component: ServiceSelector,
  },
  ItemConfig: {
    title: 'Line item config',
    Component: ItemConfig,
  },
  EmployeeLabourConfig: {
    title: 'Employee config',
    Component: EmployeeLabourConfig,
  },
  ItemChargeConfig: {
    title: 'Labour line item config',
    Component: ItemChargeConfig,
  },
  ImportOrderSelector: {
    title: 'Import Order',
    Component: ImportOrderSelector,
  },
  PaymentOverview: {
    title: 'Payments',
    Component: PaymentOverview,
  },
  CustomFieldConfig: {
    title: 'Custom Fields',
    Component: (props: Omit<CustomFieldConfigProps, 'useRouter'>) => (
      <CustomFieldConfig {...props} useRouter={useRouter} />
    ),
  },
  ImportPreset: {
    title: 'Import Preset',
    Component: (props: Omit<ImportPresetProps, 'useRouter'>) => <ImportPreset {...props} useRouter={useRouter} />,
  },
  SavePreset: {
    title: 'Save Preset',
    Component: (props: Omit<SavePresetProps, 'useRouter'>) => <SavePreset {...props} useRouter={useRouter} />,
  },
  ProductCreator: {
    title: 'Create Product',
    Component: (props: Omit<ProductCreatorProps, 'useRouter'>) => <ProductCreator {...props} useRouter={useRouter} />,
  },
  CustomFieldFilterConfig: {
    title: 'Custom Field Filters',
    Component: (props: Omit<CustomFieldFilterConfigProps, 'useRouter'>) => (
      <CustomFieldFilterConfig {...props} useRouter={useRouter} />
    ),
  },
  PrintOverview: {
    title: 'Print',
    Component: PrintOverview,
  },
  ItemSelector: {
    title: 'Select item',
    Component: ItemSelector,
  },
});
