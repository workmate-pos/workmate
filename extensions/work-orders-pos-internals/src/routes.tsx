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
import { SavePreset, SavePresetProps } from '@work-orders/common-pos/screens/custom-fields/SavePreset.js';
import { ProductCreator, ProductCreatorProps } from '@work-orders/common-pos/screens/product-creator/ProductCreator.js';
import { WorkOrderPrintOverview } from './screens/popups/WorkOrderPrintOverview.js';
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
import { EditPreset, EditPresetProps } from '@work-orders/common-pos/screens/custom-fields/EditPreset.js';
import {
  SelectPresetToEdit,
  SelectPresetToEditProps,
} from '@work-orders/common-pos/screens/custom-fields/SelectPresetToEdit.js';
import { SelectPreset, SelectPresetProps } from '@work-orders/common-pos/screens/custom-fields/SelectPreset.js';
import { WorkOrderFilters } from './screens/popups/WorkOrderFilters.js';
import { CompanySelector } from './screens/popups/CompanySelector.js';
import {
  CompanyLocationSelector,
  CompanyLocationSelectorProps,
} from '@work-orders/common-pos/screens/CompanyLocationSelector.js';
import { PaymentTermsSelector } from './screens/popups/PaymentTermsSelector.js';
import { Dropdown, DropdownProps } from '@work-orders/common-pos/screens/Dropdown.js';
import {
  CustomFieldValuesConfig,
  CustomFieldValuesConfigProps,
} from '@work-orders/common-pos/screens/custom-fields/CustomFieldValuesConfig.js';
import { PermissionBoundary } from '@work-orders/common-pos/components/PermissionBoundary.js';
import { LocationSelector, LocationSelectorProps } from '@work-orders/common-pos/screens/LocationSelector.js';
import { WorkOrderItemSourcing } from './screens/popups/WorkOrderItemSourcing.js';
import { WorkOrderItemSourcingHelp } from './screens/popups/WorkOrderItemSourcingHelp.js';
import { WorkOrderItemSourcingItem } from './screens/popups/WorkOrderItemSourcingItem.js';
import { StockTransferEntry } from './screens/StockTransferEntry.js';
import { StockTransfer } from './screens/StockTransfer.js';
import { StockTransferProductSelector } from './screens/popups/StockTransferProductSelector.js';
import { StockTransferLineItemScanner } from './screens/popups/StockTransferLineItemScanner.js';
import { StockTransferLineItemConfig } from './screens/popups/StockTransferLineItemConfig.js';
import { StockTransferLineItemStatusSelector } from './screens/popups/StockTransferLineItemStatusSelector.js';
import { ExistingStockTransfer } from './screens/popups/ExistingStockTransfer.js';
import { ListPopup } from './screens/popups/ListPopup.js';
import { ScrollView } from '@shopify/retail-ui-extensions-react';
import { PurchaseOrderEntry } from './screens/PurchaseOrderEntry.js';
import { PurchaseOrder } from './screens/PurchaseOrder.js';
import { PurchaseOrderVendorSelector } from './screens/popups/PurchaseOrderVendorSelector.js';
import { PurchaseOrderEmployeeSelector } from './screens/popups/PurchaseOrderEmployeeSelector.js';
import { PurchaseOrderProductSelector } from './screens/popups/PurchaseOrderProductSelector.js';
import { PurchaseOrderProductConfig } from './screens/popups/PurchaseOrderProductConfig.js';
import { PurchaseOrderPrintOverview } from './screens/PurchaseOrderPrintOverview.js';
import { PurchaseOrderOrderSelector } from './screens/popups/PurchaseOrderOrderSelector.js';
import { PurchaseOrderOrderProductSelector } from './screens/popups/PurchaseOrderOrderProductSelector.js';
import { PurchaseOrderFilterStatusSelector } from './screens/popups/PurchaseOrderFilterStatusSelector.js';
import { CreateTransferOrderForLocation } from './screens/popups/CreateTransferOrderForLocation.js';
import { QuantityAdjustmentList } from './screens/popups/QuantityAdjustmentList.js';

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
  WorkOrderFilters: {
    title: 'Filters',
    Component: WorkOrderFilters,
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
  CompanySelector: {
    title: 'Select Company',
    Component: CompanySelector,
  },
  CompanyLocationSelector: {
    title: 'Select Company Location',
    Component: (props: Omit<CompanyLocationSelectorProps, 'useRouter'>) => (
      <CompanyLocationSelector {...props} useRouter={useRouter} />
    ),
  },
  LocationSelector: {
    title: 'Select Location',
    Component: (props: Omit<LocationSelectorProps, 'useRouter'>) => (
      <LocationSelector {...props} useRouter={useRouter} />
    ),
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
  Dropdown: {
    title: 'Dropdown',
    Component: <const T extends string>(props: Omit<DropdownProps<T>, 'useRouter'>) => (
      <Dropdown {...props} useRouter={useRouter} />
    ),
  },
  CustomFieldValuesConfig: {
    title: 'Custom Field Values',
    Component: (props: Omit<CustomFieldValuesConfigProps, 'useRouter'>) => (
      <PermissionBoundary permissions={['read_settings', 'write_settings']}>
        <CustomFieldValuesConfig {...props} useRouter={useRouter} />
      </PermissionBoundary>
    ),
  },
  CustomFieldConfig: {
    title: 'Custom Fields',
    Component: (props: Omit<CustomFieldConfigProps, 'useRouter'>) => (
      <CustomFieldConfig {...props} useRouter={useRouter} />
    ),
  },
  EditPreset: {
    title: 'Edit Preset',
    Component: (props: Omit<EditPresetProps, 'useRouter'>) => <EditPreset {...props} useRouter={useRouter} />,
  },
  SelectPresetToEdit: {
    title: 'Edit Preset',
    Component: (props: Omit<SelectPresetToEditProps, 'useRouter'>) => (
      <SelectPresetToEdit {...props} useRouter={useRouter} />
    ),
  },
  SavePreset: {
    title: 'Save Preset',
    Component: (props: Omit<SavePresetProps, 'useRouter'>) => <SavePreset {...props} useRouter={useRouter} />,
  },
  SelectPreset: {
    title: 'Select Preset',
    Component: (props: Omit<SelectPresetProps, 'useRouter'>) => <SelectPreset {...props} useRouter={useRouter} />,
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
  WorkOrderPrintOverview: {
    title: 'Print',
    Component: WorkOrderPrintOverview,
  },
  ItemSelector: {
    title: 'Select item',
    Component: ItemSelector,
  },
  PaymentTermsSelector: {
    title: 'Select Payment Terms',
    Component: PaymentTermsSelector,
  },
  WorkOrderItemSourcing: {
    title: 'Work Order Sourcing',
    Component: WorkOrderItemSourcing,
  },
  WorkOrderItemSourcingHelp: {
    title: 'Work Order Sourcing Help',
    Component: WorkOrderItemSourcingHelp,
  },
  WorkOrderItemSourcingItem: {
    title: 'Work Order Sourcing Item',
    Component: WorkOrderItemSourcingItem,
  },
  StockTransferEntry: {
    title: 'Stock Transfer',
    Component: () => (
      <ScreenPermissionBoundary permissions={requiredPermissions}>
        <StockTransferEntry />
      </ScreenPermissionBoundary>
    ),
  },
  StockTransfer: {
    title: 'Stock Transfer',
    Component: StockTransfer,
  },
  StockTransferProductSelector: {
    title: 'Select Product',
    Component: StockTransferProductSelector,
  },
  StockTransferLineItemScanner: {
    title: 'Scan Items',
    Component: StockTransferLineItemScanner,
  },
  StockTransferLineItemConfig: {
    title: 'Line Item Config',
    Component: StockTransferLineItemConfig,
  },
  StockTransferLineItemStatusSelector: {
    title: 'Select Status',
    Component: StockTransferLineItemStatusSelector,
  },
  ExistingStockTransfer: {
    title: 'Stock Transfer',
    Component: ExistingStockTransfer,
  },
  ListPopup: {
    title: 'ListPopup',
    Component: ListPopup,
  },

  PurchaseOrderEntry: {
    title: 'Purchase Orders',
    Component: () => {
      return (
        <ScrollView>
          <ScreenPermissionBoundary permissions={['read_settings', 'read_purchase_orders', 'read_employees']}>
            <PurchaseOrderEntry />
          </ScreenPermissionBoundary>
        </ScrollView>
      );
    },
  },
  PurchaseOrder: {
    title: 'Purchase Order',
    Component: PurchaseOrder,
  },
  PurchaseOrderVendorSelector: {
    title: 'Select Vendor',
    Component: PurchaseOrderVendorSelector,
  },
  PurchaseOrderEmployeeSelector: {
    title: 'Select Employee',
    // TODO: permission boundary here?
    Component: PurchaseOrderEmployeeSelector,
  },
  PurchaseOrderProductSelector: {
    title: 'Select Product',
    Component: PurchaseOrderProductSelector,
  },
  PurchaseOrderProductConfig: {
    title: 'Product Config',
    Component: PurchaseOrderProductConfig,
  },
  PurchaseOrderPrintOverview: {
    title: 'Print Overview',
    Component: PurchaseOrderPrintOverview,
  },
  PurchaseOrderOrderSelector: {
    title: 'Select Order',
    Component: PurchaseOrderOrderSelector,
  },
  PurchaseOrderOrderProductSelector: {
    title: 'Select Order Product',
    Component: PurchaseOrderOrderProductSelector,
  },
  PurchaseOrderFilterStatusSelector: {
    title: 'Select Purchase Order Status',
    Component: PurchaseOrderFilterStatusSelector,
  },
  CreateTransferOrderForLocation: {
    title: 'Select Transfer Order Location',
    Component: CreateTransferOrderForLocation,
  },
  QuantityAdjustmentList: {
    title: 'Quantity Adjustment List',
    Component: QuantityAdjustmentList,
  },
});
